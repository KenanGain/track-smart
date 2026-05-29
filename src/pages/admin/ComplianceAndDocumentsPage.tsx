import { useEffect, useMemo, useRef, useState } from 'react';
import {
    FileText, Search, Plus, Pencil, Trash2, ChevronDown, ChevronUp, ChevronsUpDown,
    Building2, Truck, User, Filter, Save,
    ArrowLeft, Info, ExternalLink, Link2, ShieldAlert, Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubTabs, type SubTab } from '@/components/ui/SubTabs';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { DocumentTagsView } from '@/pages/settings/docu-form/DocumentTagsView';
import {
    loadTagSections, saveTagSections, newTag,
    type DocTagSection, type TagColorTheme,
} from '@/pages/settings/docu-form/document-tags.data';

/**
 * Super Admin → Compliance and Documents.
 *
 * Pill toggle in the header switches between:
 *   • Compliance — Key Numbers library, organised by category tabs
 *     (Regulatory / Tax / Codes / Bonds / Other). Each row exposes the
 *     compliance-rule toggles (number required, doc req, expiry, issue
 *     date/state/country) and an Active/Inactive status pill.
 *   • Documents — flat document library with folder + linked-to metadata,
 *     filtered by All / Carrier / Asset / Driver / Violation sub-tabs.
 */

type PageMode = 'compliance' | 'documents' | 'tags';

// ── Compliance ────────────────────────────────────────────────────────

export type KeyNumberGroup =
    | 'Regulatory and Safety Numbers'
    | 'Tax and Business Identification Numbers'
    | 'Carrier & Industry Codes'
    | 'Bond and Registration Numbers'
    | 'Other';

export type RelatedToScope = 'Carrier' | 'Asset' | 'Driver';

export interface KeyNumberRow {
    id: string;
    name: string;
    description: string;
    relatedTo: RelatedToScope;
    group: KeyNumberGroup;
    numberRequired: boolean;
    /** Mirrors the form's "Supporting Document Required?" toggle. */
    docRequired: boolean;
    /** When `docRequired` is on, the document type from the Docu/Form library this number links to. */
    linkedDocumentTypeId?: string;
    hasExpiry: boolean;
    issueDateRequired: boolean;
    issueStateRequired: boolean;
    issueCountryRequired: boolean;
    status: 'Active' | 'Inactive';
    /**
     * When on, this key number is part of the Docu/Form Generator catalog
     * and gets surfaced inside hiring templates and applicant forms.
     * Off = compliance/back-office only. Mirrors the same flag on documents.
     */
    usedInHiring?: boolean;
}

export const KEY_NUMBER_GROUPS: KeyNumberGroup[] = [
    'Regulatory and Safety Numbers',
    'Tax and Business Identification Numbers',
    'Carrier & Industry Codes',
    'Bond and Registration Numbers',
    'Other',
];

const RELATED_TO_ICON: Record<RelatedToScope, React.ComponentType<{ size?: number; className?: string }>> = {
    Carrier: Building2,
    Asset:   Truck,
    Driver:  User,
};

/** Seed used until the user wires this to backend persistence. */
export const SEED_KEY_NUMBERS: KeyNumberRow[] = [
    // ── Regulatory and Safety Numbers ─────────────────────────────────
    { id: 'kn-usdot',           name: 'USDOT Number',                       description: 'Department of Transportation identification number',     relatedTo: 'Carrier', group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: true,  issueStateRequired: true,  issueCountryRequired: true,  status: 'Active' },
    { id: 'kn-mc',              name: 'MC Number',                          description: 'Motor Carrier operating authority number',                relatedTo: 'Carrier', group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-usdot-legal',     name: 'USDOT Legal Name',                   description: 'Legal name associated with USDOT number',                 relatedTo: 'Carrier', group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: false, hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-op-auth-status',  name: 'Operating Authority Status',         description: 'Current status of operating authority',                   relatedTo: 'Carrier', group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: false, hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-mx',              name: 'MX Number',                          description: 'FMCSA motor carrier ID for Mexican carriers',             relatedTo: 'Carrier', group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Inactive' },
    { id: 'kn-sfr-date',        name: 'Safety Fitness Rating Date',         description: 'Date of last safety fitness determination',               relatedTo: 'Carrier', group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: false, hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-cvor-threshold',  name: 'CVOR Level / Threshold Status',      description: "Commercial Vehicle Operator's Registration status (ON)",  relatedTo: 'Carrier', group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: false, hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-nsc-profile',     name: 'NSC Carrier Profile Number',         description: 'National Safety Code profile number',                     relatedTo: 'Carrier', group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-copr',            name: 'COPR / Carrier Safety Profile ID',   description: 'Provincial carrier safety profile identifier',            relatedTo: 'Carrier', group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Inactive' },
    { id: 'kn-cvsa-decal',      name: 'CVSA Decal Number',                  description: 'CVSA inspection decal number',                            relatedTo: 'Asset',   group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-mvi',             name: 'MVI Number',                         description: 'Motor Vehicle Inspection number',                         relatedTo: 'Asset',   group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: false, hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-dl-std',          name: 'Driver License (Standard)',          description: 'Standard driver license number',                          relatedTo: 'Driver',  group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: true,  issueCountryRequired: true,  status: 'Active', usedInHiring: true },
    { id: 'kn-cdl',             name: 'Commercial Driver License (CDL)',    description: 'Commercial driver license number',                        relatedTo: 'Driver',  group: 'Regulatory and Safety Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: true,  issueCountryRequired: true,  status: 'Active', usedInHiring: true },

    // ── Tax and Business Identification Numbers ───────────────────────
    { id: 'kn-ein',             name: 'EIN',                                description: 'Employer Identification Number',                          relatedTo: 'Carrier', group: 'Tax and Business Identification Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-duns',            name: 'DUNS Number',                        description: 'Data Universal Numbering System identifier',              relatedTo: 'Carrier', group: 'Tax and Business Identification Numbers', numberRequired: true, docRequired: false, hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-gst-hst',         name: 'GST/HST Number',                     description: 'Canadian Goods and Services Tax number',                  relatedTo: 'Carrier', group: 'Tax and Business Identification Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-pst-qst',         name: 'PST/QST Number',                     description: 'Provincial Sales Tax / Quebec Sales Tax number',          relatedTo: 'Carrier', group: 'Tax and Business Identification Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Inactive' },
    { id: 'kn-state-tax',       name: 'State Tax ID',                       description: 'State-specific tax identification number',                relatedTo: 'Carrier', group: 'Tax and Business Identification Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-payroll',         name: 'Payroll Account Number',             description: 'Payroll deduction account (Canada RP)',                   relatedTo: 'Carrier', group: 'Tax and Business Identification Numbers', numberRequired: true, docRequired: false, hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-wsib',            name: 'WSIB / WCB Account Number',          description: 'Workplace insurance account number',                      relatedTo: 'Carrier', group: 'Tax and Business Identification Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-workers-comp',    name: 'IIB / Workers Comp Policy Number',   description: 'Workers compensation policy number (US)',                 relatedTo: 'Carrier', group: 'Tax and Business Identification Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },

    // ── Carrier & Industry Codes ──────────────────────────────────────
    { id: 'kn-naics',           name: 'NAICS Code',                         description: 'North American Industry Classification System code',      relatedTo: 'Carrier', group: 'Carrier & Industry Codes', numberRequired: true, docRequired: false, hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-sic',             name: 'SIC Code',                           description: 'Standard Industrial Classification code',                 relatedTo: 'Carrier', group: 'Carrier & Industry Codes', numberRequired: true, docRequired: false, hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Inactive' },
    { id: 'kn-scac',            name: 'Standard Carrier Alpha Code (SCAC)', description: 'Code for freight identification',                         relatedTo: 'Carrier', group: 'Carrier & Industry Codes', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-carrier-code',    name: 'Carrier Code Type',                  description: 'e.g., Private, For-Hire, Broker',                         relatedTo: 'Carrier', group: 'Carrier & Industry Codes', numberRequired: true, docRequired: false, hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-cbsa',            name: 'CBSA Carrier Code',                  description: 'Canada Border Services Agency carrier code',              relatedTo: 'Carrier', group: 'Carrier & Industry Codes', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-aci',             name: 'ACI / eManifest Carrier Code',       description: 'Canada eManifest identifier',                             relatedTo: 'Carrier', group: 'Carrier & Industry Codes', numberRequired: true, docRequired: false, hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-ace-scac',        name: 'ACE / SCAC for US Customs',          description: 'US Customs cross-border identifier',                      relatedTo: 'Carrier', group: 'Carrier & Industry Codes', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },

    // ── Bond and Registration Numbers ─────────────────────────────────
    { id: 'kn-boc3',            name: 'BOC-3 Filing',                       description: 'Process agent designation filing',                        relatedTo: 'Carrier', group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-surety',          name: 'Surety Bond Policy Number',          description: 'BMC-84 / BMC-85 bond number',                             relatedTo: 'Carrier', group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-ifta-acct',       name: 'IFTA Account Number',                description: 'International Fuel Tax Agreement account',                relatedTo: 'Carrier', group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-irp',             name: 'IRP Account Number / Fleet ID',      description: 'International Registration Plan account',                 relatedTo: 'Carrier', group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-ucr',             name: 'UCR Registration ID',                description: 'Unified Carrier Registration ID',                         relatedTo: 'Carrier', group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-hvut',            name: 'Heavy Vehicle Use Tax (HVUT 2290)',  description: '2290 Schedule 1 reference number',                        relatedTo: 'Asset',   group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-state-op-auth',   name: 'State Operating Authority / Permit Numbers', description: 'State-specific operating authorities',            relatedTo: 'Asset',   group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-kyu',             name: 'KYU Number',                         description: 'Kentucky weight-distance tax number',                     relatedTo: 'Carrier', group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-nm-weight',       name: 'NM Weight Distance Permit',          description: 'New Mexico weight distance tax permit',                   relatedTo: 'Asset',   group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-ny-hut',          name: 'NY HUT Permit',                      description: 'New York Highway Use Tax permit',                         relatedTo: 'Asset',   group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-vin',             name: 'VIN',                                description: 'Vehicle Identification Number',                           relatedTo: 'Asset',   group: 'Bond and Registration Numbers', numberRequired: true, docRequired: false, hasExpiry: false, issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-plate',           name: 'Plate #',                            description: 'Vehicle license plate number',                            relatedTo: 'Asset',   group: 'Bond and Registration Numbers', numberRequired: true, docRequired: false, hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-ifta-decal',      name: 'IFTA Decal',                         description: 'IFTA license decal number',                               relatedTo: 'Asset',   group: 'Bond and Registration Numbers', numberRequired: true, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },

    // ── Other ─────────────────────────────────────────────────────────
    { id: 'kn-hazmat',          name: 'Hazmat Permit Number',               description: 'Hazardous materials transportation permit',               relatedTo: 'Carrier', group: 'Other', numberRequired: true,  docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-fast-ctpat',      name: 'FAST / C-TPAT ID',                   description: 'Free and Secure Trade / C-TPAT identification',           relatedTo: 'Carrier', group: 'Other', numberRequired: true,  docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-twic-co',         name: 'TWIC (Company/Program)',             description: 'Transportation Worker Identification Credential',         relatedTo: 'Driver',  group: 'Other', numberRequired: true,  docRequired: false, hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Inactive' },
    { id: 'kn-drug-alcohol',    name: 'Drug & Alcohol Consortium ID',       description: 'Clearinghouse/Consortium reference ID',                   relatedTo: 'Driver',  group: 'Other', numberRequired: true,  docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active', usedInHiring: true },
    { id: 'kn-fmcsa-clear',     name: 'FMCSA Clearinghouse Query Plan ID',  description: 'Internal tracking for Clearinghouse plan',                relatedTo: 'Carrier', group: 'Other', numberRequired: true,  docRequired: false, hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-insurance',       name: 'Insurance Policy Numbers',           description: 'Liability / Cargo insurance policy numbers',              relatedTo: 'Carrier', group: 'Other', numberRequired: true,  docRequired: false, hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-transponder',     name: 'Transponder ID',                     description: 'Toll/Weigh station transponder ID',                       relatedTo: 'Asset',   group: 'Other', numberRequired: true,  docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active' },
    { id: 'kn-passport',        name: 'Passport Number',                    description: 'Official Passport Number',                                relatedTo: 'Driver',  group: 'Other', numberRequired: false, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: true,  status: 'Active', usedInHiring: true },
    { id: 'kn-fast-card',       name: 'FAST Card Number',                   description: 'Free and Secure Trade (FAST) Card',                       relatedTo: 'Driver',  group: 'Other', numberRequired: false, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: true,  status: 'Active', usedInHiring: true },
    { id: 'kn-visa',            name: 'Visa Number',                        description: 'Travel Visa Number',                                      relatedTo: 'Driver',  group: 'Other', numberRequired: false, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: true,  status: 'Active', usedInHiring: true },
    { id: 'kn-twic-card',       name: 'TWIC Card Number',                   description: 'Transportation Worker Identification Credential',         relatedTo: 'Driver',  group: 'Other', numberRequired: false, docRequired: true,  hasExpiry: true,  issueDateRequired: false, issueStateRequired: false, issueCountryRequired: false, status: 'Active', usedInHiring: true },
];

// ── Documents ─────────────────────────────────────────────────────────

export type DocumentsSubTabId = 'all' | 'carrier' | 'asset' | 'driver' | 'accidents' | 'violation';
export type DocumentTypeStatus = 'Active' | 'Inactive' | 'Draft';
type DocumentFolder =
    | 'Safety Rating' | 'Company Documents' | 'Authorities and Permits'
    | 'IFTA' | 'Accidents';

export type DocumentCategory =
    | 'License' | 'Medical' | 'Identity & Travel' | 'Background & Screening' | 'Photo'
    | 'Authority & Registration' | 'Permits' | 'Tax' | 'Insurance & Bonds'
    | 'Safety & Inspection' | 'Financial' | 'Incident' | 'Other';
type DocumentRequirement = 'required' | 'optional' | 'not_required';

/** Canonical document grouping — the root-defined classification used everywhere
 *  documents are grouped (parallel to a Key Number's `group`). */
export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
    'License', 'Medical', 'Identity & Travel', 'Background & Screening', 'Photo',
    'Authority & Registration', 'Permits', 'Tax', 'Insurance & Bonds',
    'Safety & Inspection', 'Financial', 'Incident', 'Other',
];

export interface DocumentRow {
    id: string;
    name: string;
    /** Optional admin-facing description (not shown to applicant). */
    description?: string;
    /** Broad classification dropdown — separate from the Carrier/Asset/Driver scope. */
    category?: DocumentCategory;
    /** Three-state requirement picker (Required / Optional / Not Required). */
    requirementLevel?: DocumentRequirement;
    /** Whether multiple files may be uploaded for this document. */
    allowMultiple?: boolean;
    /**
     * Surfaces this document inside the Hiring / Templates / Form flows
     * (ATS hiring templates, applicant document collection forms, etc.).
     * When off, the document is a back-office / compliance-only artifact.
     */
    usedInHiring?: boolean;
    /** Free-form classification tags. */
    tags?: string[];
    /** Linked label shown below the name. Format depends on `linkedType`. */
    linkedTo?: string;
    /**
     * Differentiates link sources for colour coding:
     *   • 'keynumber' → blue   "Linked to: <name>"
     *   • 'expense'   → emerald "Linked to Expense: <name>"
     *   • 'module'    → amber  "Linked to <module>" (Paystubs, Tickets / Offenses, Accidents)
     */
    linkedType?: 'keynumber' | 'expense' | 'module';
    /**
     * Id-based reverse of `KeyNumberRow.linkedDocumentTypeId`. When set, this
     * document and the referenced key number form a bidirectional pair —
     * picking from either side updates both, and compliance-flag toggles on
     * either row are mirrored onto its partner.
     */
    linkedKeyNumberId?: string;
    /** Mirrored from the Docu/Form Generator library — adds a violet "Docu/Form" badge + Open action. */
    source?: 'docu-form';
    folder: DocumentFolder;
    /** Compliance-rule flags shown as coloured Required/Optional pills in the table. */
    expiryRequired: boolean;
    issueDateRequired: boolean;
    issueStateRequired: boolean;
    issueCountryRequired: boolean;
    status: DocumentTypeStatus;
    scope: Exclude<DocumentsSubTabId, 'all'>;
}

const DOCUMENTS_SUB_TABS: SubTab<DocumentsSubTabId>[] = [
    { id: 'all',        label: 'All' },
    { id: 'carrier',    label: 'Carrier' },
    { id: 'asset',      label: 'Asset' },
    { id: 'driver',     label: 'Driver' },
    { id: 'accidents',  label: 'Accidents' },
    { id: 'violation',  label: 'Violation' },
];

/** Concise shorthand for the seed table — flags collapse to `0`/`1` so each row stays one line.
 *  `h` = Used in Hiring / Templates / Form. Docu/Form-source rows default to `1` even when
 *  the flag is omitted, since those rows are literally the form-generator catalog. */
type DR = Omit<DocumentRow, 'expiryRequired' | 'issueDateRequired' | 'issueStateRequired' | 'issueCountryRequired' | 'usedInHiring'> & {
    e?: 0 | 1; d?: 0 | 1; s?: 0 | 1; c?: 0 | 1; h?: 0 | 1;
};
const expand = (r: DR): DocumentRow => ({
    id: r.id, name: r.name, linkedTo: r.linkedTo, linkedType: r.linkedType, source: r.source,
    folder: r.folder, status: r.status, scope: r.scope,
    expiryRequired: !!r.e, issueDateRequired: !!r.d,
    issueStateRequired: !!r.s, issueCountryRequired: !!r.c,
    // Default: every docu-form catalog row participates in hiring forms.
    usedInHiring: r.h !== undefined ? !!r.h : r.source === 'docu-form',
});

export const DOCUMENTS: DocumentRow[] = ([
    // ── Carrier ───────────────────────────────────────────────────────
    { id: 'd-cvor',            name: 'CVOR Level 2',                                                                                             folder: 'Safety Rating',           status: 'Active', scope: 'carrier', e: 1, d: 1 },
    { id: 'd-sfc',             name: 'Safety Fitness Certificate',                                                                               folder: 'Safety Rating',           status: 'Active', scope: 'carrier', e: 1, d: 1 },
    { id: 'd-liability',       name: 'Liability Insurance',                                                                                      folder: 'Company Documents',       status: 'Active', scope: 'carrier', e: 1 },
    { id: 'd-op-auth',         name: 'Operating Authority',          linkedTo: 'MC Number',                            linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier' },
    { id: 'd-ifta-lic',        name: 'IFTA License',                 linkedTo: 'IFTA Account Number',                  linkedType: 'keynumber',  folder: 'IFTA',                    status: 'Active', scope: 'carrier', e: 1, d: 1 },
    { id: 'd-usdot',           name: 'USDOT Number',                 linkedTo: 'USDOT Number',                         linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', e: 1, d: 1, s: 1, c: 1 },
    { id: 'd-mx',              name: 'MX Number',                    linkedTo: 'MX Number',                            linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Inactive', scope: 'carrier' },
    { id: 'd-nsc',             name: 'NSC Carrier Profile',          linkedTo: 'NSC Carrier Profile Number',           linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', d: 1 },
    { id: 'd-copr',            name: 'COPR Profile',                 linkedTo: 'COPR / Carrier Safety Profile ID',     linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Inactive', scope: 'carrier' },
    { id: 'd-ein',             name: 'EIN Document',                 linkedTo: 'EIN',                                  linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'carrier' },
    { id: 'd-gst-hst',         name: 'GST/HST Registration',         linkedTo: 'GST/HST Number',                       linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'carrier' },
    { id: 'd-pst-qst',         name: 'PST/QST Registration',         linkedTo: 'PST/QST Number',                       linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Inactive', scope: 'carrier' },
    { id: 'd-state-tax',       name: 'State Tax ID',                 linkedTo: 'State Tax ID',                         linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'carrier' },
    { id: 'd-wsib',            name: 'WSIB/WCB Clearance',           linkedTo: 'WSIB / WCB Account Number',            linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'carrier', d: 1 },
    { id: 'd-workers-comp',    name: 'Workers Comp Policy',          linkedTo: 'IIB / Workers Comp Policy Number',     linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'carrier', e: 1, d: 1 },
    { id: 'd-scac',            name: 'SCAC Assignment',              linkedTo: 'Standard Carrier Alpha Code (SCAC)',   linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', e: 1, d: 1 },
    { id: 'd-cbsa',            name: 'CBSA Carrier Code',            linkedTo: 'CBSA Carrier Code',                    linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier' },
    { id: 'd-ace-scac',        name: 'ACE/SCAC Document',            linkedTo: 'ACE / SCAC for US Customs',            linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier' },
    { id: 'd-boc3',            name: 'BOC-3 Filing',                 linkedTo: 'BOC-3 Filing',                         linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier' },
    { id: 'd-surety',          name: 'Surety Bond',                  linkedTo: 'Surety Bond Policy Number',            linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', e: 1, d: 1 },
    { id: 'd-irp',             name: 'IRP Account',                  linkedTo: 'IRP Account Number / Fleet ID',        linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', e: 1, d: 1 },
    { id: 'd-ucr',             name: 'UCR Registration',             linkedTo: 'UCR Registration ID',                  linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', e: 1, d: 1 },
    { id: 'd-kyu',             name: 'KYU License',                  linkedTo: 'KYU Number',                           linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier' },
    { id: 'd-hazmat',          name: 'Hazmat Permit',                linkedTo: 'Hazmat Permit Number',                 linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', e: 1, d: 1 },
    { id: 'd-fast',            name: 'FAST/C-TPAT Cert',             linkedTo: 'FAST / C-TPAT ID',                     linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', e: 1, d: 1 },
    // Expense-linked
    { id: 'd-lumper',          name: 'Lumper Receipt',               linkedTo: 'Loading & Unloading Fees',             linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'carrier', d: 1 },
    { id: 'd-ins-premium',     name: 'Insurance Premium Invoice',    linkedTo: 'Insurance',                            linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'carrier', d: 1 },
    { id: 'd-permit',          name: 'Permit Document',              linkedTo: 'Permits',                              linkedType: 'expense',    folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', e: 1, d: 1 },
    { id: 'd-ifta-return',     name: 'IFTA Return',                  linkedTo: 'IFTA',                                 linkedType: 'expense',    folder: 'IFTA',                    status: 'Active', scope: 'carrier', d: 1 },
    { id: 'd-irp-receipt',     name: 'IRP Receipt',                  linkedTo: 'IRP',                                  linkedType: 'expense',    folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', d: 1 },
    { id: 'd-ucr-receipt',     name: 'UCR Receipt',                  linkedTo: 'UCR',                                  linkedType: 'expense',    folder: 'Authorities and Permits', status: 'Active', scope: 'carrier', d: 1 },
    { id: 'd-software',        name: 'Software Invoice',             linkedTo: 'Office Expenses',                      linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'carrier', d: 1 },
    { id: 'd-marketing',       name: 'Marketing Invoice',            linkedTo: 'Sales & Marketing',                    linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'carrier', d: 1 },
    { id: 'd-professional',    name: 'Professional Services Invoice', linkedTo: 'Legal & Professional Fees',           linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'carrier', d: 1 },
    // ── Asset ─────────────────────────────────────────────────────────
    { id: 'd-vehicle-reg',     name: 'Vehicle Registration',                                                                                    folder: 'Company Documents',       status: 'Active', scope: 'asset', e: 1, d: 1 },
    { id: 'd-annual-insp',     name: 'Annual Safety Inspection',                                                                                folder: 'Authorities and Permits', status: 'Active', scope: 'asset', e: 1, d: 1 },
    { id: 'd-lease-agreement', name: 'Lease Agreement',                                                                                         folder: 'Company Documents',       status: 'Draft',  scope: 'asset', e: 1, d: 1 },
    { id: 'd-hvut',            name: 'HVUT 2290 Schedule 1',         linkedTo: 'Heavy Vehicle Use Tax (HVUT 2290)',    linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'asset', e: 1, d: 1 },
    { id: 'd-state-op-permit', name: 'State Operating Permit',       linkedTo: 'State Operating Authority / Permit Numbers', linkedType: 'keynumber', folder: 'Authorities and Permits', status: 'Active', scope: 'asset', e: 1, d: 1 },
    { id: 'd-nm-weight-permit', name: 'NM Weight Permit',            linkedTo: 'NM Weight Distance Permit',            linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'asset', d: 1 },
    { id: 'd-ny-hut',          name: 'NY HUT Certificate',           linkedTo: 'NY HUT Permit',                        linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'asset', d: 1 },
    { id: 'd-cvsa-insp',       name: 'CVSA Inspection',              linkedTo: 'CVSA Decal Number',                    linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'asset', e: 1, d: 1 },
    { id: 'd-ifta-decal-copy', name: 'IFTA Decal Copy',              linkedTo: 'IFTA Decal',                           linkedType: 'keynumber',  folder: 'IFTA',                    status: 'Active', scope: 'asset', e: 1 },
    { id: 'd-transponder',     name: 'Transponder Doc',              linkedTo: 'Transponder ID',                       linkedType: 'keynumber',  folder: 'Authorities and Permits', status: 'Active', scope: 'asset', e: 1 },
    { id: 'd-fuel-receipt',    name: 'Fuel Receipt',                 linkedTo: 'Fuel',                                 linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'asset', d: 1 },
    { id: 'd-repair-invoice',  name: 'Repair Invoice',               linkedTo: 'Maintenance & Repairs',                linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'asset', d: 1 },
    { id: 'd-toll-receipt',    name: 'Toll Receipt',                 linkedTo: 'Tolls',                                linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'asset', d: 1 },
    { id: 'd-parking-receipt', name: 'Parking Receipt',              linkedTo: 'Parking',                              linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'asset', d: 1 },
    { id: 'd-cleaning-receipt', name: 'Cleaning Receipt',            linkedTo: 'Vehicle Cleaning',                     linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'asset', d: 1 },
    { id: 'd-lease-pmt',       name: 'Lease Payment Statement',      linkedTo: 'Depreciation / Lease Payments',        linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'asset', d: 1 },
    { id: 'd-vehicle-reg-exp', name: 'Vehicle Registration',         linkedTo: 'Vehicle Registration',                 linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'asset', e: 1, d: 1 },

    // ── Driver ────────────────────────────────────────────────────────
    { id: 'd-paystub',         name: 'Paystub',                      linkedTo: 'Paystubs',                             linkedType: 'module',     folder: 'Company Documents',       status: 'Active', scope: 'driver' },
    { id: 'd-emp-reference',   name: 'Employment Reference',                                                                                       folder: 'Company Documents',       status: 'Active', scope: 'driver', h: 1 },
    { id: 'd-dl-std',          name: 'Driver License (Standard)',    linkedTo: 'Driver License (Standard)',            linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'driver', e: 1, h: 1 },
    { id: 'd-cdl-link',        name: 'Commercial Driver License (CDL)', linkedTo: 'Commercial Driver License (CDL)',   linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'driver', e: 1, h: 1 },
    { id: 'd-med-cert-link',   name: 'Medical Examiner Certificate',                                                                               folder: 'Company Documents',       status: 'Active', scope: 'driver', e: 1, d: 1, h: 1 },
    { id: 'd-training-cert',   name: 'Training Certificate',                                                                                       folder: 'Company Documents',       status: 'Active', scope: 'driver', d: 1, h: 1 },
    { id: 'd-drug-consortium', name: 'Drug Consortium',              linkedTo: 'Drug & Alcohol Consortium ID',         linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'driver', e: 1, d: 1, h: 1 },
    { id: 'd-payroll-stmt',    name: 'Payroll Statement',            linkedTo: 'Driver Payroll',                       linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'driver', d: 1 },
    { id: 'd-travel-receipt',  name: 'Travel Receipt',               linkedTo: 'Driver Travel Expenses',               linkedType: 'expense',    folder: 'Company Documents',       status: 'Active', scope: 'driver', d: 1 },
    { id: 'd-offense-ticket-drv',  name: 'Offense Ticket',           linkedTo: 'Tickets / Offenses',                   linkedType: 'module',     folder: 'Authorities and Permits', status: 'Active', scope: 'driver', d: 1 },
    { id: 'd-payment-receipt-drv', name: 'Payment Receipt',          linkedTo: 'Tickets / Offenses',                   linkedType: 'module',     folder: 'Authorities and Permits', status: 'Active', scope: 'driver', d: 1 },
    { id: 'd-notice-trial-drv',    name: 'Notice of Trial',          linkedTo: 'Tickets / Offenses',                   linkedType: 'module',     folder: 'Authorities and Permits', status: 'Active', scope: 'driver', d: 1 },
    { id: 'd-passport-link',   name: 'Passport',                     linkedTo: 'Passport Number',                      linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'driver', e: 1, h: 1 },
    { id: 'd-fast-link',       name: 'FAST Card',                    linkedTo: 'FAST Card Number',                     linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'driver', e: 1, h: 1 },
    { id: 'd-visa-link',       name: 'Visa',                         linkedTo: 'Visa Number',                          linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'driver', e: 1, h: 1 },
    { id: 'd-twic-link',       name: 'TWIC Card',                    linkedTo: 'TWIC Card Number',                     linkedType: 'keynumber',  folder: 'Company Documents',       status: 'Active', scope: 'driver', e: 1, h: 1 },
    // Docu/Form mirrored entries — open in the Docu/Form Generator
    { id: 'd-df-cdl',          name: 'CDL — Front & Back',                                                                                      folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', e: 1, d: 1, s: 1, c: 1 },
    { id: 'd-df-med',          name: "Medical Examiner's Certificate",                                                                          folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', e: 1, d: 1 },
    { id: 'd-df-dl-front',     name: 'Driving License Front',                                                                                   folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', e: 1, d: 1, s: 1, c: 1 },
    { id: 'd-df-dl-back',      name: 'Driving License Back',                                                                                    folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver' },
    { id: 'd-df-passport',     name: 'Passport Document',                                                                                       folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', e: 1, d: 1, c: 1 },
    { id: 'd-df-criminal',     name: 'Criminal Record Document',                                                                                folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', d: 1 },
    { id: 'd-df-mvr',          name: 'State / Province Driving Record (3-year MVR)',                                                            folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', d: 1, s: 1 },
    { id: 'd-df-cvor',         name: 'Commercial Vehicle Operator Record (CVOR)',                                                               folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', d: 1, s: 1 },
    { id: 'd-df-psp',          name: 'Pre-Employment Screening Program (PSP) Report',                                                           folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', d: 1 },
    { id: 'd-df-abstract',     name: '3-Year Driver Abstract (Non-Commercial)',                                                                 folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', d: 1, s: 1 },
    { id: 'd-df-emp-exp',      name: 'Employer Experience Letter',                                                                              folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', d: 1 },
    { id: 'd-df-headshot',     name: 'Applicant Headshot / Photo',                                                                              folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver' },
    { id: 'd-df-ssn',          name: 'SSN / SIN Card',                                                                                          folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', c: 1 },
    { id: 'd-df-birth',        name: 'Birth Certificate',                                                                                       folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', d: 1, s: 1, c: 1 },
    { id: 'd-df-resume',       name: 'Resume / CV',                                                                                             folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver' },
    { id: 'd-df-veh-reg',      name: 'Vehicle Registration',                                                                                    folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', e: 1, d: 1, s: 1, c: 1 },
    { id: 'd-df-lease',        name: 'Lease Agreement',                                                                                         folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', e: 1, d: 1 },
    { id: 'd-df-offer',        name: 'Offer Letter',                                                                                            folder: 'Company Documents', source: 'docu-form', status: 'Active', scope: 'driver', d: 1 },

    // ── Violation ─────────────────────────────────────────────────────
    { id: 'd-offense-ticket',  name: 'Offense Ticket',                                                                                          folder: 'Authorities and Permits', status: 'Active', scope: 'violation', d: 1, s: 1 },
    { id: 'd-payment-receipt', name: 'Fine Payment Receipt',                                                                                    folder: 'Authorities and Permits', status: 'Active', scope: 'violation', d: 1 },
    { id: 'd-notice-trial',    name: 'Notice of Trial / Summons',                                                                               folder: 'Authorities and Permits', status: 'Active', scope: 'violation', d: 1 },
    { id: 'd-roadside-cite',   name: 'Roadside Citation',                                                                                       folder: 'Authorities and Permits', status: 'Active', scope: 'violation', d: 1, s: 1 },
    { id: 'd-hos-violation',   name: 'HOS Violation Notice',                                                                                    folder: 'Authorities and Permits', status: 'Active', scope: 'violation', d: 1 },
    { id: 'd-insp-violation',  name: 'Inspection Violation Report',                                                                             folder: 'Authorities and Permits', status: 'Active', scope: 'violation', d: 1, s: 1 },
    { id: 'd-violation-resp',  name: 'Violation Response Letter',                                                                               folder: 'Authorities and Permits', status: 'Draft',  scope: 'violation', d: 1 },
    { id: 'd-csa-bg',          name: 'CSA Behavior Analysis Snapshot',                                                                          folder: 'Authorities and Permits', status: 'Active', scope: 'violation', d: 1 },

    // ── Accidents ─────────────────────────────────────────────────────
    { id: 'd-police-report',   name: 'Police Report',                linkedTo: 'Accidents', linkedType: 'module', folder: 'Accidents', status: 'Active', scope: 'accidents', d: 1 },
    { id: 'd-driver-stmt',     name: 'Driver Statement',             linkedTo: 'Accidents', linkedType: 'module', folder: 'Accidents', status: 'Active', scope: 'accidents', d: 1 },
    { id: 'd-accident-photos', name: 'Accident Photos',              linkedTo: 'Accidents', linkedType: 'module', folder: 'Accidents', status: 'Active', scope: 'accidents', d: 1 },
    { id: 'd-witness-stmt',    name: 'Witness Statement',            linkedTo: 'Accidents', linkedType: 'module', folder: 'Accidents', status: 'Active', scope: 'accidents', d: 1 },
    { id: 'd-repair-estimate', name: 'Repair Estimate',              linkedTo: 'Accidents', linkedType: 'module', folder: 'Accidents', status: 'Active', scope: 'accidents', d: 1 },
    { id: 'd-telemetry',       name: 'Telemetry Data',               linkedTo: 'Accidents', linkedType: 'module', folder: 'Accidents', status: 'Active', scope: 'accidents', d: 1 },
] as DR[]).map(expand);

/**
 * Wire the bidirectional id-based links from the display-name links declared
 * above. The seed rows only declare the document's `linkedTo` name; this derives
 * the matching ids so the catalog's id-based linking (flag-mirroring, clean
 * unlink, "already linked" guards) works on the built-in data out of the box.
 * Links are 1:1, so the first document that names a key number wins.
 */
(() => {
    const knByName = new Map(SEED_KEY_NUMBERS.map(k => [k.name, k] as const));
    for (const d of DOCUMENTS) {
        if (d.linkedType !== 'keynumber' || !d.linkedTo) continue;
        const kn = knByName.get(d.linkedTo);
        if (!kn) continue;
        d.linkedKeyNumberId = kn.id;
        if (!kn.linkedDocumentTypeId) kn.linkedDocumentTypeId = d.id;
    }
})();

/**
 * Canonical category for each seed document, keyed by id and grouped by bucket
 * for review. This is the root-defined grouping used everywhere documents are
 * grouped (Assignment tab, profile view). New documents pick their category in
 * the Add/Edit form. Anything missing here falls back to 'Other'.
 */
const DOC_CATEGORY_SEED: Record<DocumentCategory, string[]> = {
    'License':                 ['d-dl-std', 'd-cdl-link', 'd-df-cdl', 'd-df-dl-front', 'd-df-dl-back'],
    'Medical':                 ['d-med-cert-link', 'd-df-med'],
    'Identity & Travel':       ['d-passport-link', 'd-fast-link', 'd-visa-link', 'd-twic-link', 'd-df-passport', 'd-df-ssn', 'd-df-birth'],
    'Background & Screening':  ['d-emp-reference', 'd-training-cert', 'd-drug-consortium', 'd-df-criminal', 'd-df-mvr', 'd-df-cvor', 'd-df-psp', 'd-df-abstract', 'd-df-emp-exp'],
    'Photo':                   ['d-df-headshot'],
    'Authority & Registration':['d-op-auth', 'd-ifta-lic', 'd-usdot', 'd-mx', 'd-irp', 'd-ucr', 'd-scac', 'd-cbsa', 'd-ace-scac', 'd-boc3', 'd-vehicle-reg', 'd-ifta-decal-copy', 'd-transponder', 'd-df-veh-reg'],
    'Permits':                 ['d-kyu', 'd-hazmat', 'd-fast', 'd-state-op-permit', 'd-nm-weight-permit', 'd-ny-hut'],
    'Tax':                     ['d-ein', 'd-gst-hst', 'd-pst-qst', 'd-state-tax', 'd-hvut'],
    'Insurance & Bonds':       ['d-liability', 'd-wsib', 'd-workers-comp', 'd-surety'],
    'Safety & Inspection':     ['d-cvor', 'd-sfc', 'd-nsc', 'd-copr', 'd-annual-insp', 'd-cvsa-insp', 'd-csa-bg'],
    'Financial':               ['d-lumper', 'd-ins-premium', 'd-permit', 'd-ifta-return', 'd-irp-receipt', 'd-ucr-receipt', 'd-software', 'd-marketing', 'd-professional', 'd-fuel-receipt', 'd-repair-invoice', 'd-toll-receipt', 'd-parking-receipt', 'd-cleaning-receipt', 'd-lease-pmt', 'd-vehicle-reg-exp', 'd-lease-agreement', 'd-df-lease', 'd-payroll-stmt', 'd-travel-receipt', 'd-paystub'],
    'Incident':                ['d-offense-ticket-drv', 'd-payment-receipt-drv', 'd-notice-trial-drv', 'd-offense-ticket', 'd-payment-receipt', 'd-notice-trial', 'd-roadside-cite', 'd-hos-violation', 'd-insp-violation', 'd-violation-resp', 'd-police-report', 'd-driver-stmt', 'd-accident-photos', 'd-witness-stmt', 'd-repair-estimate', 'd-telemetry'],
    'Other':                   ['d-df-resume', 'd-df-offer'],
};

(() => {
    const byId = new Map<string, DocumentCategory>();
    for (const cat of DOCUMENT_CATEGORIES) for (const id of DOC_CATEGORY_SEED[cat]) byId.set(id, cat);
    for (const d of DOCUMENTS) d.category = byId.get(d.id) ?? 'Other';
})();

/**
 * Reverse lookup — for each Key Number name, find the Document that references
 * it. Built once at module load since both seeds are constants. Used to render
 * the "Linked to: <document>" sublabel under each key number's name.
 */
const LINKED_DOCUMENT_BY_KEY_NUMBER = (() => {
    // Group all candidate documents by the Key Number name they reference,
    // then for each KN pick the best display name — preferring an exact
    // name match (USDOT Number → USDOT Number, not Visa) and otherwise
    // falling back to the first candidate. Without this preference, two
    // docs linking the same KN would race-update the map.
    const candidates = new Map<string, string[]>();
    for (const d of DOCUMENTS) {
        if (d.linkedType !== 'keynumber' || !d.linkedTo) continue;
        const arr = candidates.get(d.linkedTo) ?? [];
        arr.push(d.name);
        candidates.set(d.linkedTo, arr);
    }
    const map = new Map<string, string>();
    for (const [knName, names] of candidates) {
        const exact = names.find(n => n === knName);
        map.set(knName, exact ?? names[0]);
    }
    return map;
})();

// ── Small UI primitives ───────────────────────────────────────────────

function StatusPill({ status }: { status: 'Active' | 'Inactive' }) {
    return (
        <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            status === 'Active'
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-500",
        )}>
            {status}
        </span>
    );
}

/** Tri-state pill — mirrors the Required / Optional / Not Required radio cards from the form. */
function RequirementPill({ level }: { level?: DocumentRequirement }) {
    const v = level ?? 'required';
    const styles: Record<DocumentRequirement, string> = {
        required:     'border-blue-200 bg-blue-50 text-blue-700',
        optional:     'border-slate-200 bg-slate-50 text-slate-600',
        not_required: 'border-rose-200 bg-rose-50 text-rose-700',
    };
    const labels: Record<DocumentRequirement, string> = {
        required:     'Required',
        optional:     'Optional',
        not_required: 'Not Required',
    };
    return (
        <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            styles[v],
        )}>
            {labels[v]}
        </span>
    );
}

function DocTypeStatusPill({ status }: { status: DocumentTypeStatus }) {
    const styles: Record<DocumentTypeStatus, string> = {
        Active:   'border-emerald-200 bg-emerald-50 text-emerald-700',
        Inactive: 'border-slate-200 bg-slate-100 text-slate-500',
        Draft:    'border-slate-200 bg-slate-100 text-slate-600',
    };
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", styles[status])}>
            {status}
        </span>
    );
}


function RelatedToBadge({ scope }: { scope: RelatedToScope }) {
    const Icon = RELATED_TO_ICON[scope];
    return (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
            <Icon size={14} className="text-slate-400" />
            {scope}
        </span>
    );
}

function LinkedToLabel({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
            <FileText size={10} className="shrink-0" />
            <span className="truncate">Linked to: {label}</span>
        </span>
    );
}

function LinkedToExpense({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
            <FileText size={10} className="shrink-0" />
            <span className="truncate">Linked to Expense: {label}</span>
        </span>
    );
}

/** Module-level link (Paystubs / Tickets / Accidents) — amber. */
function LinkedToModule({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
            <Link2 size={10} className="shrink-0" />
            <span className="truncate">Linked to {label}</span>
        </span>
    );
}

/** Source label for documents mirrored from the Docu/Form Generator library.
 *  Inline text (violet) to match the other "Linked to …" meta chips — not a pill. */
function DocuFormBadge() {
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600">
            <FileText size={10} className="shrink-0" />
            Docu/Form
        </span>
    );
}

// ── Add / Edit Key Number — dedicated page view ───────────────────────

/** Build a blank Key Number draft pre-filled for a category. */
function newKeyNumberDraft(group: KeyNumberGroup): KeyNumberRow {
    return {
        id: `kn-${Math.random().toString(36).slice(2, 9)}`,
        name: '',
        description: '',
        relatedTo: 'Carrier',
        group,
        numberRequired: true,
        docRequired: false,
        hasExpiry: false,
        issueDateRequired: false,
        issueStateRequired: false,
        issueCountryRequired: false,
        status: 'Active',
    };
}

const INPUT_CLS =
    "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 " +
    "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

/** Toggle row used inside the Requirements & Validation card — label + help on the left, switch on the right. */
function RequirementRow({ label, help, checked, onChange }: {
    label: string;
    help: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div
            onClick={() => onChange(!checked)}
            className={cn(
                "flex w-full cursor-pointer items-start justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
                checked ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-white hover:bg-slate-50",
            )}
        >
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{help}</p>
            </div>
            <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                <Toggle checked={checked} onCheckedChange={onChange} />
            </div>
        </div>
    );
}

/** Dedicated page-style Add/Edit view — replaces the previous modal. */
function KeyNumberFormPage({ initial, isNew, onSave, onCancel, documents, onCreateDocument }: {
    initial: KeyNumberRow;
    isNew: boolean;
    onSave: (row: KeyNumberRow) => void;
    onCancel: () => void;
    /** Live document catalog (parent state) — drives the link picker. */
    documents: DocumentRow[];
    /** Create a brand-new document from the inline "+" quick-create modal. */
    onCreateDocument: (doc: DocumentRow) => void;
}) {
    const [draft, setDraft] = useState<KeyNumberRow>(initial);
    const [creatingDoc, setCreatingDoc] = useState(false);
    const up = (p: Partial<KeyNumberRow>) => setDraft(d => ({ ...d, ...p }));
    // When a supporting document is required, a linked document type must be picked.
    const canSave = draft.name.trim().length > 0 && (!draft.docRequired || !!draft.linkedDocumentTypeId);

    // Document Type picker — the live catalog Documents library, scoped to this
    // number's Related-To and filtered to active types. `linkedDocumentTypeId`
    // therefore references a DocumentRow id, consistent with the list view and
    // the Link modals (no second id space).
    const docTypes = useMemo<DocumentRow[]>(
        () => documents.filter(d => d.status === 'Active' && d.scope === draft.relatedTo.toLowerCase()),
        [documents, draft.relatedTo],
    );

    /**
     * Sync compliance flags from a picked document onto this number. Accepts an
     * optional row so the quick-create flow can link a just-made document before
     * it lands in the `documents` prop on the next render.
     */
    const linkDocumentType = (id: string, doc?: DocumentRow) => {
        const d = doc ?? documents.find(x => x.id === id);
        if (!d) {
            up({ linkedDocumentTypeId: undefined });
            return;
        }
        up({
            linkedDocumentTypeId: d.id,
            hasExpiry: d.expiryRequired || draft.hasExpiry,
            issueDateRequired: d.issueDateRequired || draft.issueDateRequired,
            issueStateRequired: d.issueStateRequired || draft.issueStateRequired,
            issueCountryRequired: d.issueCountryRequired || draft.issueCountryRequired,
        });
    };

    /** Quick-create a document, register it with the parent, then link it. */
    const handleCreateDocument = (doc: DocumentRow) => {
        onCreateDocument(doc);
        linkDocumentType(doc.id, doc);
        setCreatingDoc(false);
    };

    const relatedToBtn = (scope: RelatedToScope) => {
        const Icon = RELATED_TO_ICON[scope];
        const active = draft.relatedTo === scope;
        return (
            <button
                key={scope}
                type="button"
                onClick={() => up({ relatedTo: scope })}
                className={cn(
                    "relative flex flex-col items-center gap-3 rounded-xl border bg-white px-6 py-6 transition-colors",
                    active
                        ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-200"
                        : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/20",
                )}
            >
                <span className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500",
                )}>
                    <Icon size={22} />
                </span>
                <span className={cn(
                    "text-sm font-semibold",
                    active ? "text-blue-900" : "text-slate-700",
                )}>{scope}</span>
                <span className={cn(
                    "absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border-2",
                    active ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white",
                )}>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
            </button>
        );
    };

    return (
        <div className="flex h-full flex-col bg-slate-50/50">
            {/* Sticky header: Back, title, subtitle, Cancel + Save Changes */}
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Back to list"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                {isNew ? 'Add Key Number' : 'Edit Key Number'}
                            </h2>
                            <p className="text-[12px] text-slate-500">
                                {isNew
                                    ? `Add new number to ${draft.group}`
                                    : `Editing in ${draft.group}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onCancel}>Cancel</Button>
                        <Button
                            disabled={!canSave}
                            onClick={() => onSave({ ...draft, name: draft.name.trim() })}
                            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Save className="h-4 w-4" /> Save Changes
                        </Button>
                    </div>
                </div>
            </header>

            {/* Body */}
            <main className="flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto flex max-w-4xl flex-col gap-5">
                    {/* ── Basic Information ──────────────────────────── */}
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-bold text-slate-900">Basic Information</h3>

                        {/* Related To */}
                        <div className="mb-5">
                            <label className="mb-2.5 block text-sm font-semibold text-slate-700">
                                Related To <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {(['Carrier', 'Asset', 'Driver'] as RelatedToScope[]).map(relatedToBtn)}
                            </div>
                        </div>

                        {/* Number Type Name */}
                        <div className="mb-5">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Number Type Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                autoFocus
                                value={draft.name}
                                onChange={(e) => up({ name: e.target.value })}
                                placeholder="Enter number name (e.g. DOT Number)"
                                className={INPUT_CLS}
                            />
                            {draft.description.length > 0 && (
                                <p className="mt-1 text-[11px] text-slate-400">{draft.description}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="mb-5">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                            <textarea
                                value={draft.description}
                                onChange={(e) => up({ description: e.target.value })}
                                placeholder="Short description shown under the name in the list view."
                                className="min-h-[64px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                            <div className="flex items-center gap-6">
                                {(['Active', 'Inactive'] as const).map(s => (
                                    <label key={s} className="inline-flex cursor-pointer items-center gap-2">
                                        <input
                                            type="radio"
                                            name="kn-status"
                                            checked={draft.status === s}
                                            onChange={() => up({ status: s })}
                                            className="h-4 w-4 accent-blue-600"
                                        />
                                        <span className={cn(
                                            "text-sm font-semibold",
                                            draft.status === s ? "text-slate-900" : "text-slate-600",
                                        )}>{s}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── Requirements & Validation ──────────────────── */}
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-bold text-slate-900">Requirements &amp; Validation</h3>

                        {/* Hiring / Templates / Form usage — full-width row at the top */}
                        <div className="mb-3">
                            <RequirementRow
                                label="Used in Hiring / Templates / Form"
                                help="When on, this number is part of the Docu/Form Generator catalog and appears in hiring templates / applicant forms."
                                checked={!!draft.usedInHiring}
                                onChange={(v) => up({ usedInHiring: v })}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <RequirementRow
                                label="Number Required?"
                                help="Makes this number mandatory"
                                checked={draft.numberRequired}
                                onChange={(v) => up({ numberRequired: v })}
                            />
                            <RequirementRow
                                label="Has Expiry?"
                                help="Enables expiry & renewal tracking"
                                checked={draft.hasExpiry}
                                onChange={(v) => up({ hasExpiry: v })}
                            />
                            <RequirementRow
                                label="Issue Date Required?"
                                help="Makes issue date mandatory"
                                checked={draft.issueDateRequired}
                                onChange={(v) => up({ issueDateRequired: v })}
                            />
                            <RequirementRow
                                label="Issue State Required?"
                                help="Requires selection of issuing state/province"
                                checked={draft.issueStateRequired}
                                onChange={(v) => up({ issueStateRequired: v })}
                            />
                            <RequirementRow
                                label="Issue Country Required?"
                                help="Requires selection of issuing country"
                                checked={draft.issueCountryRequired}
                                onChange={(v) => up({ issueCountryRequired: v })}
                            />
                        </div>

                        {/* Full-width Supporting Document toggle */}
                        <div className="mt-3">
                            <RequirementRow
                                label="Supporting Document Required?"
                                help="Requires an upload and validates against document type"
                                checked={draft.docRequired}
                                onChange={(v) => {
                                    up({ docRequired: v });
                                    if (!v) up({ linkedDocumentTypeId: undefined });
                                }}
                            />
                        </div>

                        {/* Document Type picker — only when Supporting Document Required is ON */}
                        {draft.docRequired && (
                            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/30 p-5">
                                <div className="mb-2 flex items-center gap-2">
                                    <label className="text-sm font-semibold text-slate-700">
                                        Link to Document Type <span className="text-rose-500">*</span>
                                    </label>
                                    <span className="inline-flex items-center rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                        Auto-syncs settings
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={draft.linkedDocumentTypeId ?? ''}
                                        onChange={(e) => linkDocumentType(e.target.value)}
                                        className={INPUT_CLS}
                                    >
                                        <option value="">Select a document type…</option>
                                        {docTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setCreatingDoc(true)}
                                        title="Create a new document and link it"
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-blue-700">
                                    <Info size={12} className="mt-0.5 shrink-0" />
                                    Showing {draft.relatedTo} documents. Selecting one syncs its expiry and issue-date requirements onto this number. Use <span className="font-semibold">+</span> to create a new one.
                                </p>
                                {draft.docRequired && !draft.linkedDocumentTypeId && (
                                    <p className="mt-1 text-[11px] font-medium text-rose-600">
                                        Pick or create a document type to satisfy "Supporting Document Required".
                                    </p>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {creatingDoc && (
                    <QuickCreateDocumentModal
                        scope={draft.relatedTo.toLowerCase() as Exclude<DocumentsSubTabId, 'all' | 'accidents' | 'violation'>}
                        onCreate={handleCreateDocument}
                        onClose={() => setCreatingDoc(false)}
                    />
                )}
            </main>
        </div>
    );
}

/**
 * Lightweight modal to create a document inline from the Key Number form's "+".
 * Captures the essentials (name, category, status); scope is inherited from the
 * number's Related-To. The admin can flesh out the rest later in the full
 * Document Type form. Returns the new row to the caller for linking.
 */
function QuickCreateDocumentModal({ scope, onCreate, onClose }: {
    scope: Exclude<DocumentsSubTabId, 'all' | 'accidents' | 'violation'>;
    onCreate: (doc: DocumentRow) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState<DocumentCategory>('Authority & Registration');
    const [status, setStatus] = useState<DocumentTypeStatus>('Active');
    const scopeLabel = scope.charAt(0).toUpperCase() + scope.slice(1);
    const canCreate = name.trim().length > 0;

    const create = () => {
        if (!canCreate) return;
        onCreate({
            id: `doc-${Math.random().toString(36).slice(2, 9)}`,
            name: name.trim(),
            description: '',
            category,
            requirementLevel: 'required',
            allowMultiple: false,
            tags: [],
            folder: 'Company Documents',
            usedInHiring: false,
            expiryRequired: false,
            issueDateRequired: false,
            issueStateRequired: false,
            issueCountryRequired: false,
            status,
            scope,
        });
    };

    return (
        <div
            role="dialog"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-6"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-base font-bold text-slate-900">New Document Type</h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                        Creates a <span className="font-semibold text-slate-700">{scopeLabel}</span> document and links it to this number. You can edit its full settings later under Documents.
                    </p>
                </div>
                <div className="space-y-4 px-6 py-5">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Document Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
                            placeholder="e.g. Operating Authority Letter"
                            className={INPUT_CLS}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                                className={INPUT_CLS}
                            >
                                {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as DocumentTypeStatus)}
                                className={INPUT_CLS}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Draft">Draft</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!canCreate} onClick={create} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        <Plus className="h-4 w-4" /> Create &amp; Link
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Dropdown menu next to the "+ Add Number to Category" button — lets the admin
 * pick which category the new number lands in. Click outside closes it.
 */
function AddCategoryMenu({ onPick, onClose }: {
    onPick: (group: KeyNumberGroup) => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
            <ul className="py-1">
                {KEY_NUMBER_GROUPS.map(g => (
                    <li key={g}>
                        <button
                            type="button"
                            onClick={() => onPick(g)}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        >
                            {g}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Compliance (Key Numbers) view ─────────────────────────────────────

/**
 * Modal — pick (and configure) a single Document Type that supports a Key
 * Number. Designed as a compact form, not a giant list:
 *   1. Category select narrows the document dropdown to the right scope.
 *   2. Document select picks the one supporting doc (1:1 — a key number
 *      has at most one document partner; the warning shows when picking a
 *      doc that's already paired with another key number, since linking it
 *      here will move the pair).
 *   3. Configuration card surfaces the doc's compliance toggles and lets
 *      the admin edit them right here — edits write straight back to the
 *      document and, after Link, those flags mirror onto the key number.
 */
const LINK_CATEGORIES: { id: DocumentsSubTabId; label: string }[] = [
    { id: 'all',        label: 'All' },
    { id: 'carrier',    label: 'Carrier' },
    { id: 'asset',      label: 'Asset' },
    { id: 'driver',     label: 'Driver' },
    { id: 'accidents',  label: 'Accidents' },
    { id: 'violation',  label: 'Violation' },
];

/** Compact toggle row used inside the link-modal configuration card. */
function ConfigToggleRow({ label, help, checked, onChange }: {
    label: string;
    help?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">{label}</p>
                {help && <p className="mt-0.5 text-[11px] text-slate-500">{help}</p>}
            </div>
            <Toggle checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

function LinkDocumentModal({ keyNumber, documents, keyNumbers, onLink, onPatchDocument, onCancel }: {
    keyNumber: KeyNumberRow;
    documents: DocumentRow[];
    keyNumbers: KeyNumberRow[];
    onLink: (documentId: string) => void;
    onPatchDocument: (id: string, patch: Partial<DocumentRow>) => void;
    onCancel: () => void;
}) {
    const [selectedId, setSelectedId] = useState(keyNumber.linkedDocumentTypeId ?? '');

    const defaultCategory = keyNumber.relatedTo.toLowerCase() as DocumentsSubTabId;
    const [category, setCategory] = useState<DocumentsSubTabId>(
        LINK_CATEGORIES.some(c => c.id === defaultCategory) ? defaultCategory : 'all',
    );

    const active = documents.filter(d => d.status === 'Active');
    const inCategory = active.filter(d => category === 'all' || d.scope === category);
    const selected = documents.find(d => d.id === selectedId);

    // 1:1 conflict — if the picked document is already paired to a different
    // key number, surface a warning so the admin knows the link will move.
    const conflictKn = selected && selected.linkedKeyNumberId && selected.linkedKeyNumberId !== keyNumber.id
        ? keyNumbers.find(k => k.id === selected.linkedKeyNumberId)
        : null;

    const RelatedIcon = RELATED_TO_ICON[keyNumber.relatedTo];

    return (
        <div
            role="dialog"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
            onClick={onCancel}
        >
            <div
                className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Link Supporting Document</h3>
                            <p className="mt-0.5 text-[12px] text-slate-500">
                                Pick the single document that supports{' '}
                                <span className="font-semibold text-slate-700">{keyNumber.name}</span>.
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            <RelatedIcon size={12} className="text-slate-400" />
                            {keyNumber.relatedTo}
                        </span>
                    </div>
                </div>

                {/* Body — proper form layout */}
                <div className="flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5">
                    <div className="space-y-4">
                        {/* Category */}
                        <div>
                            <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => { setCategory(e.target.value as DocumentsSubTabId); setSelectedId(''); }}
                                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {LINK_CATEGORIES.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.label} ({c.id === 'all' ? active.length : active.filter(d => d.scope === c.id).length})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Document */}
                        <div>
                            <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                                Document Type <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Select a document type…</option>
                                {inCategory.length === 0 ? (
                                    <option disabled>No documents in this category</option>
                                ) : (
                                    inCategory.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                            {d.linkedKeyNumberId && d.linkedKeyNumberId !== keyNumber.id ? ' — already linked' : ''}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Conflict warning */}
                        {conflictKn && (
                            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5">
                                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
                                <p className="text-[12px] text-amber-800">
                                    <span className="font-semibold">{selected?.name}</span> is currently linked to{' '}
                                    <span className="font-semibold">{conflictKn.name}</span>. Confirming will move the link
                                    onto <span className="font-semibold">{keyNumber.name}</span>.
                                </p>
                            </div>
                        )}

                        {/* Configuration card — view + edit the doc's compliance flags */}
                        {selected ? (
                            <div className="rounded-xl border border-slate-200 bg-white">
                                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
                                            <FileText size={15} className="text-blue-500" />
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-slate-900">{selected.name}</p>
                                                <RequirementPill level={selected.requirementLevel} />
                                            </div>
                                            <p className="text-[11px] text-slate-500">
                                                Category: {SCOPE_LABEL[selected.scope]} • Status: {selected.status}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                        Editing live
                                    </span>
                                </div>

                                <div className="space-y-2 px-4 py-3">
                                    {/* Tri-state Document Requirement picker — same options as the form */}
                                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                        <p className="text-[13px] font-semibold text-slate-800">Document Requirement</p>
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            {(['required','optional','not_required'] as DocumentRequirement[]).map(lvl => {
                                                const labels = { required: 'Required', optional: 'Optional', not_required: 'Not Required' };
                                                const on = (selected.requirementLevel ?? 'required') === lvl;
                                                return (
                                                    <button
                                                        key={lvl}
                                                        type="button"
                                                        onClick={() => onPatchDocument(selected.id, { requirementLevel: lvl })}
                                                        className={cn(
                                                            "rounded-md border px-2 py-1.5 text-[12px] font-semibold transition-colors",
                                                            on
                                                                ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/30",
                                                        )}
                                                    >
                                                        {labels[lvl]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <ConfigToggleRow
                                        label="Used in Hiring / Templates / Form"
                                        help="Surfaces this doc inside hiring templates and applicant forms."
                                        checked={!!selected.usedInHiring}
                                        onChange={(v) => onPatchDocument(selected.id, { usedInHiring: v })}
                                    />
                                    <ConfigToggleRow
                                        label="Allow Multiple"
                                        help="More than one file per applicant."
                                        checked={!!selected.allowMultiple}
                                        onChange={(v) => onPatchDocument(selected.id, { allowMultiple: v })}
                                    />
                                    <ConfigToggleRow
                                        label="Expiry Required"
                                        help="Capture an expiry date on upload."
                                        checked={selected.expiryRequired}
                                        onChange={(v) => onPatchDocument(selected.id, { expiryRequired: v })}
                                    />
                                    <ConfigToggleRow
                                        label="Issue Date Required"
                                        help="Capture an issue date on upload."
                                        checked={selected.issueDateRequired}
                                        onChange={(v) => onPatchDocument(selected.id, { issueDateRequired: v })}
                                    />
                                    <ConfigToggleRow
                                        label="Issue State Required"
                                        help="Requires selection of issuing state/province."
                                        checked={selected.issueStateRequired}
                                        onChange={(v) => onPatchDocument(selected.id, { issueStateRequired: v })}
                                    />
                                    <ConfigToggleRow
                                        label="Issue Country Required"
                                        help="Requires selection of issuing country."
                                        checked={selected.issueCountryRequired}
                                        onChange={(v) => onPatchDocument(selected.id, { issueCountryRequired: v })}
                                    />
                                </div>

                                <div className="border-t border-slate-100 bg-blue-50/40 px-4 py-2.5">
                                    <p className="flex items-start gap-1.5 text-[11px] text-blue-800">
                                        <Info size={12} className="mt-0.5 shrink-0" />
                                        These settings save on the document and mirror onto{' '}
                                        <span className="font-semibold">{keyNumber.name}</span> when linked.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
                                <FileText size={20} className="mx-auto text-slate-300" />
                                <p className="mt-2 text-[13px] font-medium text-slate-700">No document selected</p>
                                <p className="mt-0.5 text-[11px] text-slate-500">Pick a document to view and edit its compliance configuration.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button
                        onClick={() => selectedId && onLink(selectedId)}
                        disabled={!selectedId}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Link2 className="h-4 w-4" />
                        {keyNumber.linkedDocumentTypeId === selectedId ? 'Save Link' : 'Link Document'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Mirror of LinkDocumentModal — pick (and edit) the single Key Number that
 * this Document supports. Same compact form layout: category select, key
 * number select, then a live-editing configuration card for the key number's
 * compliance flags. 1:1 enforced — picking a key number already paired
 * elsewhere surfaces a warning that the link will move.
 */
const KEY_NUMBER_RELATED_CATEGORIES: { id: 'all' | RelatedToScope; label: string }[] = [
    { id: 'all',     label: 'All' },
    { id: 'Carrier', label: 'Carrier' },
    { id: 'Asset',   label: 'Asset' },
    { id: 'Driver',  label: 'Driver' },
];

function LinkKeyNumberModal({ document, keyNumbers, documents, onLink, onPatchKeyNumber, onCancel }: {
    document: DocumentRow;
    keyNumbers: KeyNumberRow[];
    documents: DocumentRow[];
    onLink: (keyNumberId: string) => void;
    onPatchKeyNumber: (id: string, patch: Partial<KeyNumberRow>) => void;
    onCancel: () => void;
}) {
    const [selectedId, setSelectedId] = useState(document.linkedKeyNumberId ?? '');

    const scopeAsRelated = (() => {
        if (document.scope === 'carrier') return 'Carrier' as RelatedToScope;
        if (document.scope === 'asset')   return 'Asset'   as RelatedToScope;
        if (document.scope === 'driver')  return 'Driver'  as RelatedToScope;
        return null;
    })();
    const [category, setCategory] = useState<'all' | RelatedToScope>(scopeAsRelated ?? 'all');

    const active = keyNumbers.filter(k => k.status === 'Active');
    const inCategory = active.filter(k => category === 'all' || k.relatedTo === category);
    const selected = keyNumbers.find(k => k.id === selectedId);

    const conflictDoc = selected && selected.linkedDocumentTypeId && selected.linkedDocumentTypeId !== document.id
        ? documents.find(d => d.id === selected.linkedDocumentTypeId)
        : null;

    return (
        <div
            role="dialog"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
            onClick={onCancel}
        >
            <div
                className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Link to Key Number</h3>
                            <p className="mt-0.5 text-[12px] text-slate-500">
                                Pick the single key number that{' '}
                                <span className="font-semibold text-slate-700">{document.name}</span> supports.
                            </p>
                        </div>
                        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            {SCOPE_LABEL[document.scope]}
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5">
                    <div className="space-y-4">
                        {/* Category */}
                        <div>
                            <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                                Related To
                            </label>
                            <select
                                value={category}
                                onChange={(e) => { setCategory(e.target.value as 'all' | RelatedToScope); setSelectedId(''); }}
                                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {KEY_NUMBER_RELATED_CATEGORIES.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.label} ({c.id === 'all' ? active.length : active.filter(k => k.relatedTo === c.id).length})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Key Number */}
                        <div>
                            <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                                Key Number <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Select a key number…</option>
                                {inCategory.length === 0 ? (
                                    <option disabled>No key numbers in this category</option>
                                ) : (
                                    inCategory.map(k => (
                                        <option key={k.id} value={k.id}>
                                            {k.name}
                                            {k.linkedDocumentTypeId && k.linkedDocumentTypeId !== document.id ? ' — already linked' : ''}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Conflict warning */}
                        {conflictDoc && (
                            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5">
                                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
                                <p className="text-[12px] text-amber-800">
                                    <span className="font-semibold">{selected?.name}</span> is currently linked to{' '}
                                    <span className="font-semibold">{conflictDoc.name}</span>. Confirming will move the link
                                    onto <span className="font-semibold">{document.name}</span>.
                                </p>
                            </div>
                        )}

                        {/* Configuration card — edit the key number's flags */}
                        {selected ? (
                            <div className="rounded-xl border border-slate-200 bg-white">
                                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
                                            {(() => {
                                                const Icon = RELATED_TO_ICON[selected.relatedTo];
                                                return <Icon size={15} className="text-blue-500" />;
                                            })()}
                                        </span>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{selected.name}</p>
                                            <p className="text-[11px] text-slate-500">
                                                {selected.relatedTo} • {selected.group}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                        Editing live
                                    </span>
                                </div>

                                <div className="space-y-2 px-4 py-3">
                                    <ConfigToggleRow
                                        label="Used in Hiring / Templates / Form"
                                        help="Surfaces this number inside the Docu/Form Generator (hiring templates and applicant forms)."
                                        checked={!!selected.usedInHiring}
                                        onChange={(v) => onPatchKeyNumber(selected.id, { usedInHiring: v })}
                                    />
                                    <ConfigToggleRow
                                        label="Number Required"
                                        help="Makes this number mandatory."
                                        checked={selected.numberRequired}
                                        onChange={(v) => onPatchKeyNumber(selected.id, { numberRequired: v })}
                                    />
                                    <ConfigToggleRow
                                        label="Has Expiry"
                                        help="Enables expiry & renewal tracking."
                                        checked={selected.hasExpiry}
                                        onChange={(v) => onPatchKeyNumber(selected.id, { hasExpiry: v })}
                                    />
                                    <ConfigToggleRow
                                        label="Issue Date Required"
                                        help="Makes issue date mandatory."
                                        checked={selected.issueDateRequired}
                                        onChange={(v) => onPatchKeyNumber(selected.id, { issueDateRequired: v })}
                                    />
                                    <ConfigToggleRow
                                        label="Issue State Required"
                                        help="Requires selection of issuing state/province."
                                        checked={selected.issueStateRequired}
                                        onChange={(v) => onPatchKeyNumber(selected.id, { issueStateRequired: v })}
                                    />
                                    <ConfigToggleRow
                                        label="Issue Country Required"
                                        help="Requires selection of issuing country."
                                        checked={selected.issueCountryRequired}
                                        onChange={(v) => onPatchKeyNumber(selected.id, { issueCountryRequired: v })}
                                    />
                                </div>

                                <div className="border-t border-slate-100 bg-blue-50/40 px-4 py-2.5">
                                    <p className="flex items-start gap-1.5 text-[11px] text-blue-800">
                                        <Info size={12} className="mt-0.5 shrink-0" />
                                        These settings save on the key number and mirror onto{' '}
                                        <span className="font-semibold">{document.name}</span> when linked.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
                                <FileText size={20} className="mx-auto text-slate-300" />
                                <p className="mt-2 text-[13px] font-medium text-slate-700">No key number selected</p>
                                <p className="mt-0.5 text-[11px] text-slate-500">Pick a key number to view and edit its compliance configuration.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button
                        onClick={() => selectedId && onLink(selectedId)}
                        disabled={!selectedId}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Link2 className="h-4 w-4" />
                        {document.linkedKeyNumberId === selectedId ? 'Save Link' : 'Link Key Number'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

type KeyNumberSortKey =
    | 'name' | 'relatedTo' | 'status'
    | 'usedInHiring' | 'numberRequired' | 'docRequired' | 'hasExpiry'
    | 'issueDateRequired' | 'issueStateRequired' | 'issueCountryRequired';

const KEY_NUMBER_BOOLEAN_SORT_KEYS = new Set<KeyNumberSortKey>([
    'usedInHiring', 'numberRequired', 'docRequired', 'hasExpiry',
    'issueDateRequired', 'issueStateRequired', 'issueCountryRequired',
]);

/** Clickable table header that sorts the list by its column. */
function SortableTh({ label, sortKey, sort, onSort, className, align = 'left' }: {
    label: React.ReactNode;
    sortKey: KeyNumberSortKey;
    sort: { key: KeyNumberSortKey; dir: 'asc' | 'desc' } | null;
    onSort: (k: KeyNumberSortKey) => void;
    className?: string;
    align?: 'left' | 'center';
}) {
    const active = sort?.key === sortKey;
    return (
        <th className={className}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={cn(
                    "group inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.05em] transition-colors hover:text-slate-700",
                    align === 'center' && "justify-center",
                    active ? "text-blue-600" : "text-slate-500",
                )}
            >
                <span>{label}</span>
                {active
                    ? (sort!.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                    : <ChevronsUpDown size={12} className="text-slate-300 group-hover:text-slate-400" />}
            </button>
        </th>
    );
}

function KeyNumbersView({ rows, allKeyNumbers, documents, onPatch, onPatchDocument, onLinkDocument, onUnlinkDocument, onEdit, onDelete }: {
    rows: KeyNumberRow[];
    allKeyNumbers: KeyNumberRow[];
    documents: DocumentRow[];
    onPatch: (id: string, patch: Partial<KeyNumberRow>) => void;
    onPatchDocument: (id: string, patch: Partial<DocumentRow>) => void;
    onLinkDocument: (keyNumberId: string, documentId: string) => void;
    onUnlinkDocument: (keyNumberId: string) => void;
    onEdit: (row: KeyNumberRow) => void;
    onDelete: (id: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [relatedFilter, setRelatedFilter] = useState<'all' | RelatedToScope>('all');
    const [linkingFor, setLinkingFor] = useState<KeyNumberRow | null>(null);
    const [sort, setSort] = useState<{ key: KeyNumberSortKey; dir: 'asc' | 'desc' } | null>(null);

    // Click a column header to sort the currently-filtered rows by it. Boolean
    // columns default to enabled-first (desc) so "which are on" surface at the
    // top; text columns default to A→Z.
    const handleSort = (key: KeyNumberSortKey) => {
        setSort(prev => {
            if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
            return { key, dir: KEY_NUMBER_BOOLEAN_SORT_KEYS.has(key) ? 'desc' : 'asc' };
        });
    };

    const documentById = useMemo(
        () => new Map(documents.map(d => [d.id, d])),
        [documents],
    );

    // Counts per Related-To within the current category, for the filter bubbles.
    const relatedCounts = useMemo(() => {
        const c: Record<'all' | RelatedToScope, number> = { all: rows.length, Carrier: 0, Asset: 0, Driver: 0 };
        for (const r of rows) c[r.relatedTo] += 1;
        return c;
    }, [rows]);

    /**
     * Doc Required toggle behaviour:
     *   • ON  → open picker modal, defer the patch until the admin confirms
     *   • OFF → clear the link on both sides (parent handles the mirror)
     */
    const handleDocRequiredToggle = (row: KeyNumberRow, v: boolean) => {
        if (v) {
            setLinkingFor(row);
        } else {
            onUnlinkDocument(row.id);
        }
    };

    const handleLinkConfirm = (documentId: string) => {
        if (!linkingFor) return;
        onLinkDocument(linkingFor.id, documentId);
        setLinkingFor(null);
    };

    /**
     * Resolve the "Linked to: <name>" label. Only shows when Doc Required is
     * on. Prefers an explicitly-linked Document by id; falls back to the seed
     * map so existing rows keep their natural display until edited.
     */
    const resolveLinkedName = (r: KeyNumberRow): string | null => {
        if (!r.docRequired) return null;
        if (r.linkedDocumentTypeId) {
            const d = documentById.get(r.linkedDocumentTypeId);
            if (d) return d.name;
        }
        return LINKED_DOCUMENT_BY_KEY_NUMBER.get(r.name) ?? null;
    };

    const q = query.trim().toLowerCase();
    const searched = q
        ? rows.filter(r =>
            r.name.toLowerCase().includes(q)
            || r.description.toLowerCase().includes(q)
            || r.relatedTo.toLowerCase().includes(q))
        : rows;
    const filtered = relatedFilter === 'all'
        ? searched
        : searched.filter(r => r.relatedTo === relatedFilter);

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const dir = sort.dir === 'asc' ? 1 : -1;
        const val = (r: KeyNumberRow): string | number => {
            switch (sort.key) {
                case 'name':       return r.name.toLowerCase();
                case 'relatedTo':  return r.relatedTo;
                case 'status':     return r.status;
                default:           return r[sort.key] ? 1 : 0; // boolean flag columns
            }
        };
        return [...filtered].sort((a, b) => {
            const av = val(a), bv = val(b);
            const cmp = typeof av === 'number' && typeof bv === 'number'
                ? av - bv
                : String(av).localeCompare(String(bv));
            if (cmp !== 0) return cmp * dir;
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); // stable tiebreak
        });
    }, [filtered, sort]);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Toolbar — sits inside the card, divides into the table */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40 px-4 py-3">
                <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search numbers…"
                        className="h-9 w-72 rounded-full border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden text-[12px] text-slate-500 sm:inline">
                        Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of {rows.length}
                    </span>
                </div>
            </div>

            {/* Related-To filter chips with count bubbles */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-4 py-2.5">
                <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <Filter size={12} /> Related to
                </span>
                {([
                    { id: 'all',     label: 'All' },
                    { id: 'Carrier', label: 'Carrier' },
                    { id: 'Asset',   label: 'Asset' },
                    { id: 'Driver',  label: 'Driver' },
                ] as const).map(opt => {
                    const active = relatedFilter === opt.id;
                    const Icon = opt.id === 'all' ? null : RELATED_TO_ICON[opt.id];
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRelatedFilter(opt.id)}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors",
                                active
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                            )}
                        >
                            {Icon && <Icon size={12} className={active ? "text-blue-600" : "text-slate-400"} />}
                            {opt.label}
                            <span className={cn(
                                "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                                active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500",
                            )}>
                                {relatedCounts[opt.id]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                    <thead>
                        <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                            <SortableTh label="Number Name" sortKey="name" sort={sort} onSort={handleSort} className="px-4 py-3 w-[27%]" />
                            <SortableTh label="Related To" sortKey="relatedTo" sort={sort} onSort={handleSort} className="px-3 py-3 w-[8%]" />
                            <SortableTh label={<>In Hiring /<br/>Form</>} sortKey="usedInHiring" sort={sort} onSort={handleSort} className="px-2 py-3 w-[7%] text-center" align="center" />
                            <SortableTh label={<>Number<br/>Required</>} sortKey="numberRequired" sort={sort} onSort={handleSort} className="px-2 py-3 w-[7%] text-center" align="center" />
                            <SortableTh label={<>Doc<br/>Required</>} sortKey="docRequired" sort={sort} onSort={handleSort} className="px-2 py-3 w-[7%] text-center" align="center" />
                            <SortableTh label={<>Has<br/>Expiry</>} sortKey="hasExpiry" sort={sort} onSort={handleSort} className="px-2 py-3 w-[7%] text-center" align="center" />
                            <SortableTh label={<>Issue<br/>Date</>} sortKey="issueDateRequired" sort={sort} onSort={handleSort} className="px-2 py-3 w-[7%] text-center" align="center" />
                            <SortableTh label={<>Issue<br/>State</>} sortKey="issueStateRequired" sort={sort} onSort={handleSort} className="px-2 py-3 w-[7%] text-center" align="center" />
                            <SortableTh label={<>Issue<br/>Country</>} sortKey="issueCountryRequired" sort={sort} onSort={handleSort} className="px-2 py-3 w-[7%] text-center" align="center" />
                            <SortableTh label="Status" sortKey="status" sort={sort} onSort={handleSort} className="px-3 py-3 w-[8%]" />
                            <th className="px-3 py-3 w-[6%] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-4 py-20 text-center">
                                    <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                            <Search className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">No numbers in this category</p>
                                        <p className="text-[12px] text-slate-500">Try a different tab or clear the search.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sorted.map((r) => {
                                const linkedName = resolveLinkedName(r);
                                return (
                                <tr key={r.id} className="border-t border-slate-100 transition-colors hover:bg-blue-50/30">
                                    <td className="px-4 py-3 align-top">
                                        <div className="font-semibold text-slate-900">{r.name}</div>
                                        {linkedName && (
                                            <button
                                                type="button"
                                                onClick={() => setLinkingFor(r)}
                                                className="mt-0.5 inline-flex rounded text-left hover:underline focus:outline-none focus:ring-1 focus:ring-blue-300"
                                                title="Change linked document"
                                            >
                                                <LinkedToLabel label={linkedName} />
                                            </button>
                                        )}
                                        <div className="mt-0.5 text-[12px] leading-snug text-slate-500">{r.description}</div>
                                    </td>
                                    <td className="px-3 py-3 align-top"><RelatedToBadge scope={r.relatedTo} /></td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={!!r.usedInHiring} onCheckedChange={(v) => onPatch(r.id, { usedInHiring: v })} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={r.numberRequired} onCheckedChange={(v) => onPatch(r.id, { numberRequired: v })} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={r.docRequired} onCheckedChange={(v) => handleDocRequiredToggle(r, v)} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={r.hasExpiry} onCheckedChange={(v) => onPatch(r.id, { hasExpiry: v })} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={r.issueDateRequired} onCheckedChange={(v) => onPatch(r.id, { issueDateRequired: v })} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={r.issueStateRequired} onCheckedChange={(v) => onPatch(r.id, { issueStateRequired: v })} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={r.issueCountryRequired} onCheckedChange={(v) => onPatch(r.id, { issueCountryRequired: v })} />
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 align-top"><StatusPill status={r.status} /></td>
                                    <td className="px-3 py-3 align-top text-right">
                                        <div className="inline-flex items-center gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => onEdit(r)}
                                                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(r.id)}
                                                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {linkingFor && (
                <LinkDocumentModal
                    keyNumber={linkingFor}
                    documents={documents}
                    keyNumbers={allKeyNumbers}
                    onLink={handleLinkConfirm}
                    onPatchDocument={onPatchDocument}
                    onCancel={() => setLinkingFor(null)}
                />
            )}
        </div>
    );
}

// ── Documents view ────────────────────────────────────────────────────

/** Convert internal scope id to the "Category" column label shown in the table. */
const SCOPE_LABEL: Record<Exclude<DocumentsSubTabId, 'all'>, string> = {
    carrier:   'Carrier',
    asset:     'Asset',
    driver:    'Driver',
    accidents: 'Accidents',
    violation: 'Violation',
};

type DocLinkFilter = 'all' | 'number' | 'expense' | 'system';

/** Classify a document into a single linkage bucket (mutually exclusive). */
function docLinkBucket(r: DocumentRow): 'number' | 'expense' | 'system' | 'none' {
    if (r.linkedType === 'keynumber' || r.linkedKeyNumberId) return 'number';
    if (r.linkedType === 'expense') return 'expense';
    if (r.source === 'docu-form' || r.linkedType === 'module') return 'system';
    return 'none';
}

function DocumentsView({ rows, total, allDocuments, keyNumbers, onPatch, onPatchKeyNumber, onLinkKeyNumber, onUnlinkKeyNumber, onEdit, onDelete }: {
    rows: DocumentRow[];
    total: number;
    allDocuments: DocumentRow[];
    keyNumbers: KeyNumberRow[];
    onPatch: (id: string, patch: Partial<DocumentRow>) => void;
    onPatchKeyNumber: (id: string, patch: Partial<KeyNumberRow>) => void;
    onLinkKeyNumber: (documentId: string, keyNumberId: string) => void;
    onUnlinkKeyNumber: (documentId: string) => void;
    onEdit: (row: DocumentRow) => void;
    onDelete: (id: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [linkFilter, setLinkFilter] = useState<DocLinkFilter>('all');
    const [linkingFor, setLinkingFor] = useState<DocumentRow | null>(null);

    const keyNumberById = useMemo(
        () => new Map(keyNumbers.map(k => [k.id, k])),
        [keyNumbers],
    );

    // Counts per linkage bucket within the current scope tab, for the pill badges.
    const linkCounts = useMemo(() => {
        const c: Record<DocLinkFilter, number> = { all: rows.length, number: 0, expense: 0, system: 0 };
        for (const r of rows) {
            const b = docLinkBucket(r);
            if (b !== 'none') c[b] += 1;
        }
        return c;
    }, [rows]);

    /**
     * Resolve the key-number link. Prefers an explicitly-set
     * `linkedKeyNumberId`, falling back to the legacy `linkedTo` string for
     * seed documents that haven't yet been re-picked via the modal.
     */
    const resolveLinkedKey = (r: DocumentRow): { label: string; source: 'id' | 'legacy' } | null => {
        if (r.linkedKeyNumberId) {
            const k = keyNumberById.get(r.linkedKeyNumberId);
            if (k) return { label: k.name, source: 'id' };
        }
        if (r.linkedType === 'keynumber' && r.linkedTo) return { label: r.linkedTo, source: 'legacy' };
        return null;
    };

    const q = query.trim().toLowerCase();
    const searched = q
        ? rows.filter(r =>
            r.name.toLowerCase().includes(q)
            || (r.linkedTo ?? '').toLowerCase().includes(q)
            || r.folder.toLowerCase().includes(q))
        : rows;
    const filtered = linkFilter === 'all'
        ? searched
        : searched.filter(r => docLinkBucket(r) === linkFilter);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Toolbar — Search + Filter + count, sits inside the card */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40 px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search types..."
                            className="h-9 w-72 rounded-full border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <Filter size={13} /> Filter <ChevronDown size={12} />
                    </button>
                </div>
                <span className="text-[12px] text-slate-500">
                    Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of {total} types
                </span>
            </div>

            {/* Linkage filter chips with count bubbles */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-4 py-2.5">
                <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <Link2 size={12} /> Linked to
                </span>
                {([
                    { id: 'all',     label: 'All',               Icon: null },
                    { id: 'number',  label: 'Linked to Number',  Icon: Link2 },
                    { id: 'expense', label: 'Linked to Expense', Icon: Receipt },
                    { id: 'system',  label: 'System Form',       Icon: FileText },
                ] as const).map(opt => {
                    const active = linkFilter === opt.id;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLinkFilter(opt.id)}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors",
                                active
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                            )}
                        >
                            {opt.Icon && <opt.Icon size={12} className={active ? "text-blue-600" : "text-slate-400"} />}
                            {opt.label}
                            <span className={cn(
                                "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                                active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500",
                            )}>
                                {linkCounts[opt.id]}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1350px] text-sm">
                    <thead className="bg-slate-50">
                        <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                            <th className="px-4 py-3 w-[22%]">Document Name</th>
                            <th className="px-3 py-3 w-[8%]">Category</th>
                            <th className="px-3 py-3 w-[9%]">Requirement</th>
                            <th className="px-2 py-3 w-[7%] text-center">In Hiring /<br/>Form</th>
                            <th className="px-2 py-3 w-[7%] text-center">Allow<br/>Multiple</th>
                            <th className="px-2 py-3 w-[7%] text-center">Expiry<br/>Req.</th>
                            <th className="px-2 py-3 w-[7%] text-center">Issue<br/>Date</th>
                            <th className="px-2 py-3 w-[7%] text-center">Issue<br/>State</th>
                            <th className="px-2 py-3 w-[7%] text-center">Issue<br/>Country</th>
                            <th className="px-3 py-3 w-[7%]">Status</th>
                            <th className="px-3 py-3 w-[5%] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-4 py-20 text-center">
                                    <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                            <FileText className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">No documents in this scope</p>
                                        <p className="text-[12px] text-slate-500">Try a different sub-tab or clear the search.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(r => {
                                const isDocuForm = r.source === 'docu-form';
                                const keyLink = resolveLinkedKey(r);
                                return (
                                <tr key={r.id} className="transition-colors hover:bg-blue-50/30">
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex items-start gap-2.5">
                                                <div className={cn(
                                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                                                    isDocuForm ? "bg-violet-50" : "bg-blue-50",
                                                )}>
                                                    <FileText className={cn(
                                                        "h-4 w-4",
                                                        isDocuForm ? "text-violet-500" : "text-blue-500",
                                                    )} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900">{r.name}</p>
                                                    {/* Meta — link affordance + source/linkage chip, each on its own
                                                        line so module/expense/docu-form rows all look consistent. */}
                                                    <div className="mt-1 flex flex-col items-start gap-1">
                                                        {keyLink ? (
                                                            <span className="inline-flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setLinkingFor(r)}
                                                                    className="inline-flex rounded text-left hover:underline focus:outline-none focus:ring-1 focus:ring-blue-300"
                                                                    title="Change linked key number"
                                                                >
                                                                    <LinkedToLabel label={keyLink.label} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onUnlinkKeyNumber(r.id)}
                                                                    className="text-[11px] leading-none text-slate-400 hover:text-rose-600"
                                                                    title="Unlink key number"
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setLinkingFor(r)}
                                                                className="inline-flex items-center gap-1 rounded text-[11px] text-slate-400 hover:text-blue-600 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-300"
                                                                title="Link a key number"
                                                            >
                                                                <Link2 size={10} /> Link key number
                                                            </button>
                                                        )}
                                                        {r.linkedTo && r.linkedType === 'expense'   && <LinkedToExpense label={r.linkedTo} />}
                                                        {r.linkedTo && r.linkedType === 'module'    && <LinkedToModule label={r.linkedTo} />}
                                                        {isDocuForm && <DocuFormBadge />}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-top text-sm text-slate-700">{SCOPE_LABEL[r.scope]}</td>
                                        <td className="px-3 py-3 align-top">
                                            <RequirementPill level={r.requirementLevel} />
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={!!r.usedInHiring} onCheckedChange={(v) => onPatch(r.id, { usedInHiring: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={!!r.allowMultiple} onCheckedChange={(v) => onPatch(r.id, { allowMultiple: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={r.expiryRequired} onCheckedChange={(v) => onPatch(r.id, { expiryRequired: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={r.issueDateRequired} onCheckedChange={(v) => onPatch(r.id, { issueDateRequired: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={r.issueStateRequired} onCheckedChange={(v) => onPatch(r.id, { issueStateRequired: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={r.issueCountryRequired} onCheckedChange={(v) => onPatch(r.id, { issueCountryRequired: v })} />
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-top"><DocTypeStatusPill status={r.status} /></td>
                                        <td className="px-3 py-3 align-top text-right">
                                            <div className="inline-flex items-center gap-0.5">
                                                {isDocuForm ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onEdit(r)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-md text-violet-500 hover:bg-violet-50 hover:text-violet-700"
                                                        title="Open in Docu/Form Generator"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => onEdit(r)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        {r.linkedType === 'expense' ? (
                                                            <button
                                                                type="button"
                                                                disabled
                                                                className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-slate-300"
                                                                title="Linked to an expense — it's part of the form, so it can't be deleted. You can still edit it."
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => onDelete(r.id)}
                                                                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {linkingFor && (
                    <LinkKeyNumberModal
                        document={linkingFor}
                        keyNumbers={keyNumbers}
                        documents={allDocuments}
                        onLink={(keyNumberId) => {
                            onLinkKeyNumber(linkingFor.id, keyNumberId);
                            setLinkingFor(null);
                        }}
                        onPatchKeyNumber={onPatchKeyNumber}
                        onCancel={() => setLinkingFor(null)}
                    />
                )}
        </div>
    );
}

// ── Add / Edit Document Type — dedicated page view ───────────────────

/** Blank Document row pre-filled with sensible defaults. */
function newDocumentDraft(): DocumentRow {
    return {
        id: `doc-${Math.random().toString(36).slice(2, 9)}`,
        name: '',
        description: '',
        category: 'Other',
        requirementLevel: 'required',
        allowMultiple: false,
        tags: [],
        folder: 'Company Documents',
        expiryRequired: false,
        issueDateRequired: false,
        issueStateRequired: false,
        issueCountryRequired: false,
        status: 'Active',
        scope: 'carrier',
    };
}

/** Related-To card shown in the form — 4 options matching the screenshot. */
const DOC_RELATED_TO_CARDS: { scope: Exclude<DocumentsSubTabId, 'all' | 'accidents'>; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { scope: 'carrier',   label: 'Carrier',   icon: Building2 },
    { scope: 'asset',     label: 'Asset',     icon: Truck },
    { scope: 'driver',    label: 'Driver',    icon: User },
    { scope: 'violation', label: 'Violation', icon: ShieldAlert },
];

/** Inline tag-manager modal used by the Super Admin Document Type form. */
/** Tailwind colour fragments for each tag-section theme. */
const TAG_THEME: Record<TagColorTheme, { dot: string; bg: string; text: string; border: string }> = {
    blue:    { dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
    emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    amber:   { dot: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    violet:  { dot: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
    rose:    { dot: 'bg-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
    indigo:  { dot: 'bg-indigo-500',  bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
    cyan:    { dot: 'bg-cyan-500',    bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
};

/**
 * Library-driven tags modal. Tags are sourced from the Document Tags library
 * (Insurance, Policies, Year, Quarter, CVOR Level, etc.). The admin picks
 * applicable tags per section. For sections with `allowCustomTags: true`
 * the admin can type a new tag inline; sections that disallow custom tags
 * (Year / Quarter / CVOR Level) only let the admin pick from the seeded set.
 */
function DocTagsModal({ initial, onSave, onClose }: {
    initial: string[]; // selected tag IDs
    onSave: (selectedTagIds: string[]) => void;
    onClose: () => void;
}) {
    const [sections, setSections] = useState<DocTagSection[]>(() => loadTagSections());
    const [selected, setSelected] = useState<Set<string>>(new Set(initial));
    const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});

    const toggleTag = (section: DocTagSection, tagId: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(tagId)) {
                next.delete(tagId);
                return next;
            }
            // For single-select sections (e.g. Quarter, CVOR Level), unset any
            // other already-picked tag from the same section before adding.
            if (!section.multiSelect) {
                for (const t of section.tags) next.delete(t.id);
            }
            next.add(tagId);
            return next;
        });
    };

    const addCustomTag = (section: DocTagSection) => {
        const v = (customDrafts[section.id] ?? '').trim();
        if (!v) return;
        const dup = section.tags.find(t => t.label.toLowerCase() === v.toLowerCase());
        if (dup) {
            // Already exists — just select it.
            toggleTag(section, dup.id);
            setCustomDrafts(c => ({ ...c, [section.id]: '' }));
            return;
        }
        const created = newTag(v);
        const nextSections = sections.map(s =>
            s.id === section.id ? { ...s, tags: [...s.tags, created] } : s
        );
        setSections(nextSections);
        saveTagSections(nextSections);          // persist new tag back to the library
        setSelected(prev => new Set(prev).add(created.id));
        setCustomDrafts(c => ({ ...c, [section.id]: '' }));
    };

    return (
        <div
            role="dialog"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Manage Tags</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                            Pick the tags that apply to this document. Tag sections are managed
                            in Super Admin → Compliance and Documents → Document Tags.
                        </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {selected.size} selected
                    </span>
                </div>

                {/* Body — one card per section */}
                <div className="flex-1 overflow-y-auto bg-slate-50/40 px-6 py-4">
                    {sections.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
                            <p className="text-sm font-medium text-slate-700">No tag sections defined yet</p>
                            <p className="mt-1 text-[12px] text-slate-500">
                                Add sections from the Document Tags page first.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sections.map(section => {
                                const theme = TAG_THEME[section.colorTheme];
                                const draftValue = customDrafts[section.id] ?? '';
                                return (
                                    <div key={section.id} className="rounded-lg border border-slate-200 bg-white p-4">
                                        <div className="mb-2 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{section.title}</p>
                                                <p className="mt-0.5 text-[11px] text-slate-500">{section.description}</p>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                {section.multiSelect ? 'Multi-select' : 'Single-select'}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {section.tags.map(t => {
                                                const isOn = selected.has(t.id);
                                                return (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => toggleTag(section, t.id)}
                                                        className={cn(
                                                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                                                            isOn
                                                                ? `${theme.bg} ${theme.text} ${theme.border} ring-2 ring-offset-1 ring-${section.colorTheme}-400`.replace('ring-blue-400', 'ring-blue-400')
                                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                                                        )}
                                                    >
                                                        <span className={cn("h-1.5 w-1.5 rounded-full", theme.dot)} />
                                                        {t.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {section.allowCustomTags ? (
                                            <div className="mt-3 flex items-center gap-2">
                                                <input
                                                    value={draftValue}
                                                    onChange={(e) => setCustomDrafts(c => ({ ...c, [section.id]: e.target.value }))}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(section); } }}
                                                    placeholder="Add a custom tag…"
                                                    className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-3 text-[12px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => addCustomTag(section)}
                                                    disabled={!draftValue.trim()}
                                                    className="gap-1.5"
                                                >
                                                    <Plus size={13} /> Add
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="mt-2 flex items-center gap-1 text-[11px] italic text-slate-400">
                                                <Info size={11} /> Custom tags are disabled for this section.
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave([...selected])} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        Save Tags
                    </Button>
                </div>
            </div>
        </div>
    );
}

/** Resolve a saved tag id back to its section + label for display in the form. */
function resolveTag(tagId: string, sections: DocTagSection[]): { section: DocTagSection; label: string } | null {
    for (const s of sections) {
        const t = s.tags.find(x => x.id === tagId);
        if (t) return { section: s, label: t.label };
    }
    return null;
}

/** Three-state radio card used for Document Requirement. */
function RequirementCard({ active, title, description, onSelect }: {
    active: boolean;
    title: string;
    description: string;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors",
                active
                    ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-200"
                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/20",
            )}
        >
            <div className="flex w-full items-center justify-between">
                <span className={cn("text-sm font-semibold", active ? "text-blue-900" : "text-slate-900")}>
                    {title}
                </span>
                <span className={cn(
                    "h-4 w-4 rounded-full",
                    active ? "bg-blue-600 ring-2 ring-blue-600 ring-offset-2 ring-offset-white" : "border-2 border-slate-300 bg-white",
                )} />
            </div>
            <p className="text-[11px] leading-snug text-slate-500">{description}</p>
        </button>
    );
}

function DocumentTypeFormPage({ initial, isNew, onSave, onCancel }: {
    initial: DocumentRow;
    isNew: boolean;
    onSave: (row: DocumentRow) => void;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState<DocumentRow>(initial);
    const [managingTags, setManagingTags] = useState(false);
    // Load tag sections once so the chips can render with the right section colour theme.
    const [tagSections, setTagSections] = useState<DocTagSection[]>(() => loadTagSections());
    const up = (p: Partial<DocumentRow>) => setDraft(d => ({ ...d, ...p }));
    const canSave = draft.name.trim().length > 0;

    return (
        <div className="flex h-full flex-col bg-slate-50/50">
            {/* Sticky header */}
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Back to list"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h2 className="text-base font-bold text-slate-900">
                            {isNew ? 'Create Document Type' : 'Edit Document Type'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onCancel}>Cancel</Button>
                        <Button
                            disabled={!canSave}
                            onClick={() => onSave({ ...draft, name: draft.name.trim() })}
                            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Save className="h-4 w-4" />
                            {isNew ? 'Save Document Type' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Body */}
            <main className="flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto flex max-w-4xl flex-col gap-5">
                    {/* ── Basic Information ──────────────────────────── */}
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center gap-2">
                            <span className="h-5 w-1 rounded-full bg-blue-500" />
                            <h3 className="text-base font-bold text-slate-900">Basic Information</h3>
                        </div>

                        {/* Document Name */}
                        <div className="mb-5">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Document Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                autoFocus
                                value={draft.name}
                                onChange={(e) => up({ name: e.target.value })}
                                placeholder="e.g. Liability Insurance"
                                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* Related To — 4 cards (Carrier / Asset / Driver / Violation) */}
                        <div className="mb-5">
                            <label className="mb-2.5 block text-sm font-semibold text-slate-700">
                                Related To <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {DOC_RELATED_TO_CARDS.map(card => {
                                    const Icon = card.icon;
                                    const active = draft.scope === card.scope;
                                    return (
                                        <button
                                            key={card.scope}
                                            type="button"
                                            onClick={() => up({ scope: card.scope })}
                                            className={cn(
                                                "relative flex flex-col items-center gap-3 rounded-xl border bg-white px-6 py-6 transition-colors",
                                                active
                                                    ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-200"
                                                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/20",
                                            )}
                                        >
                                            <span className={cn(
                                                "flex h-12 w-12 items-center justify-center rounded-full",
                                                active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500",
                                            )}>
                                                <Icon size={22} />
                                            </span>
                                            <span className={cn(
                                                "text-sm font-semibold",
                                                active ? "text-blue-900" : "text-slate-700",
                                            )}>{card.label}</span>
                                            <span className={cn(
                                                "absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border-2",
                                                active ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white",
                                            )}>
                                                {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Category + Status dropdowns */}
                        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Category</label>
                                <select
                                    value={draft.category ?? 'Other'}
                                    onChange={(e) => up({ category: e.target.value as DocumentCategory })}
                                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
                                <select
                                    value={draft.status}
                                    onChange={(e) => up({ status: e.target.value as DocumentTypeStatus })}
                                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Draft">Draft</option>
                                </select>
                            </div>
                        </div>

                        {/* Short Description */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Short Description</label>
                            <textarea
                                value={draft.description ?? ''}
                                onChange={(e) => up({ description: e.target.value })}
                                placeholder="Brief description..."
                                className="min-h-[72px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </section>

                    {/* ── Classification & Tags ──────────────────────── */}
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Link2 size={16} className="text-slate-500" />
                                <h3 className="text-base font-bold text-slate-900">Classification &amp; Tags</h3>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setManagingTags(true)}
                                className="gap-1.5"
                            >
                                Manage Tags
                            </Button>
                        </div>
                        {(draft.tags ?? []).length === 0 ? (
                            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3">
                                <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                <p className="text-[13px] text-slate-500">
                                    No tags selected. Click <span className="font-semibold text-slate-700">"Manage Tags"</span> to categorize this document.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Group selected tags by section so the source of each is obvious. */}
                                {tagSections.map(section => {
                                    const theme = TAG_THEME[section.colorTheme];
                                    const picks = section.tags.filter(t => (draft.tags ?? []).includes(t.id));
                                    if (picks.length === 0) return null;
                                    return (
                                        <div key={section.id} className="flex flex-wrap items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                {section.title}:
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {picks.map(t => (
                                                    <span
                                                        key={t.id}
                                                        className={cn(
                                                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium",
                                                            theme.bg, theme.text, theme.border,
                                                        )}
                                                    >
                                                        <span className={cn("h-1.5 w-1.5 rounded-full", theme.dot)} />
                                                        {t.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Orphan tags — picked previously but their section/tag no longer exists in the library. */}
                                {(() => {
                                    const orphans = (draft.tags ?? []).filter(id => !resolveTag(id, tagSections));
                                    if (orphans.length === 0) return null;
                                    return (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                Other:
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {orphans.map(id => (
                                                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-500">
                                                        {id}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </section>

                    {/* ── Configuration Rules ────────────────────────── */}
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-bold text-slate-900">Configuration Rules</h3>

                        {/* Document Requirement — 3-card picker */}
                        <div className="mb-5">
                            <label className="mb-2.5 block text-sm font-semibold text-slate-700">
                                Document Requirement
                            </label>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <RequirementCard
                                    active={(draft.requirementLevel ?? 'required') === 'required'}
                                    title="Required"
                                    description="Document must be uploaded and valid."
                                    onSelect={() => up({ requirementLevel: 'required' })}
                                />
                                <RequirementCard
                                    active={draft.requirementLevel === 'optional'}
                                    title="Optional"
                                    description="Document can be uploaded but is not mandatory."
                                    onSelect={() => up({ requirementLevel: 'optional' })}
                                />
                                <RequirementCard
                                    active={draft.requirementLevel === 'not_required'}
                                    title="Not Required"
                                    description="No document upload is expected."
                                    onSelect={() => up({ requirementLevel: 'not_required' })}
                                />
                            </div>
                        </div>

                        {/* Hiring / Templates / Form usage — surfaces the doc in the ATS workflow */}
                        <div className="mb-3">
                            <RequirementRow
                                label="Used in Hiring / Templates / Form"
                                help="When on, this document appears inside hiring templates and applicant forms. Off = compliance/back-office only."
                                checked={!!draft.usedInHiring}
                                onChange={(v) => up({ usedInHiring: v })}
                            />
                        </div>

                        {/* Allow multiple — full width */}
                        <div className="mb-3">
                            <RequirementRow
                                label="Allow multiple"
                                help="More than one file per applicant."
                                checked={!!draft.allowMultiple}
                                onChange={(v) => up({ allowMultiple: v })}
                            />
                        </div>

                        {/* Expiry + Issue Date — 2-col */}
                        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <RequirementRow
                                label="Expiry Date Input"
                                help="Capture an expiry date on upload."
                                checked={draft.expiryRequired}
                                onChange={(v) => up({ expiryRequired: v })}
                            />
                            <RequirementRow
                                label="Issue Date Input"
                                help="Capture an issue date on upload."
                                checked={draft.issueDateRequired}
                                onChange={(v) => up({ issueDateRequired: v })}
                            />
                        </div>

                        {/* Issue State / Country — full width each */}
                        <div className="mb-3">
                            <RequirementRow
                                label="Issue State Required?"
                                help="Requires selection of issuing state/province"
                                checked={draft.issueStateRequired}
                                onChange={(v) => up({ issueStateRequired: v })}
                            />
                        </div>
                        <div>
                            <RequirementRow
                                label="Issue Country Required?"
                                help="Requires selection of issuing country"
                                checked={draft.issueCountryRequired}
                                onChange={(v) => up({ issueCountryRequired: v })}
                            />
                        </div>
                    </section>
                </div>

                {/* Tag manager modal — sources from the Document Tags library */}
                {managingTags && (
                    <DocTagsModal
                        initial={draft.tags ?? []}
                        onSave={(tags) => {
                            up({ tags });
                            // Pick up any custom tags the modal saved back to the library.
                            setTagSections(loadTagSections());
                            setManagingTags(false);
                        }}
                        onClose={() => setManagingTags(false)}
                    />
                )}
            </main>
        </div>
    );
}

// ── Page shell ────────────────────────────────────────────────────────

export const ComplianceAndDocumentsPage = () => {
    const [pageMode, setPageMode] = useState<PageMode>('compliance');

    // Compliance state — key numbers + active category tab.
    const [keyNumbers, setKeyNumbers] = useState<KeyNumberRow[]>(SEED_KEY_NUMBERS);
    const [complianceGroup, setComplianceGroup] = useState<KeyNumberGroup | 'All'>('All');

    // Add / Edit view state — `null` means "list view", populated means the dedicated form page is showing.
    const [formState, setFormState] = useState<
        | { mode: 'add' | 'edit'; initial: KeyNumberRow }
        | null
    >(null);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    // Document Tags pill: parent-controlled "open Create Section modal" flag.
    const [addingTagSection, setAddingTagSection] = useState(false);

    // Documents state — list + active relatedTo sub-tab + Add/Edit form view.
    const [documents, setDocuments] = useState<DocumentRow[]>(DOCUMENTS);
    const [documentsTab, setDocumentsTab] = useState<DocumentsSubTabId>('all');
    const [docFormState, setDocFormState] = useState<
        | { mode: 'add' | 'edit'; initial: DocumentRow }
        | null
    >(null);

    const upsertDocument = (row: DocumentRow) => {
        setDocuments(prev => {
            const idx = prev.findIndex(r => r.id === row.id);
            if (idx === -1) return [row, ...prev];
            const next = [...prev];
            next[idx] = row;
            return next;
        });
        setDocumentsTab(row.scope);
        setDocFormState(null);
    };

    const deleteDocument = (id: string) => {
        // Expense-linked documents are part of the form — editable but never deletable.
        const target = documents.find(r => r.id === id);
        if (target?.linkedType === 'expense') {
            window.alert("This document is linked to an expense and is part of the form, so it can't be deleted. You can still edit it.");
            return;
        }
        if (!window.confirm('Delete this document type?')) return;
        setDocuments(prev => prev.filter(r => r.id !== id));
        // Cascade: clear the partner key number's link if it pointed here.
        setKeyNumbers(prev => prev.map(k =>
            k.linkedDocumentTypeId === id
                ? { ...k, linkedDocumentTypeId: undefined }
                : k));
    };

    /**
     * Compliance flags that mirror across a key-number ↔ document link.
     * Field names differ slightly between the two models, so each direction
     * has its own translator.
     */
    const knFlagsFromDoc = (d: DocumentRow): Partial<KeyNumberRow> => ({
        hasExpiry:            d.expiryRequired,
        issueDateRequired:    d.issueDateRequired,
        issueStateRequired:   d.issueStateRequired,
        issueCountryRequired: d.issueCountryRequired,
    });
    const docFlagsFromKn = (k: KeyNumberRow): Partial<DocumentRow> => ({
        expiryRequired:       k.hasExpiry,
        issueDateRequired:    k.issueDateRequired,
        issueStateRequired:   k.issueStateRequired,
        issueCountryRequired: k.issueCountryRequired,
    });

    /**
     * Patch a document and mirror any compliance-flag changes onto the
     * linked key number (if any). Keeps the two sides in sync after edits.
     */
    const patchDocument = (id: string, patch: Partial<DocumentRow>) => {
        setDocuments(prevDocs => {
            const updated = prevDocs.map(r => r.id === id ? { ...r, ...patch } : r);
            const target = updated.find(d => d.id === id);
            if (target?.linkedKeyNumberId) {
                const flagFields: (keyof DocumentRow)[] = [
                    'expiryRequired', 'issueDateRequired', 'issueStateRequired', 'issueCountryRequired',
                ];
                const touchesFlags = flagFields.some(f => f in patch);
                if (touchesFlags) {
                    setKeyNumbers(prevKns => prevKns.map(k =>
                        k.id === target.linkedKeyNumberId ? { ...k, ...knFlagsFromDoc(target) } : k,
                    ));
                }
            }
            return updated;
        });
    };

    /**
     * Patch a key number and mirror flag changes onto the linked document.
     */
    const patchKeyNumber = (id: string, patch: Partial<KeyNumberRow>) => {
        setKeyNumbers(prevKns => {
            const updated = prevKns.map(r => r.id === id ? { ...r, ...patch } : r);
            const target = updated.find(k => k.id === id);
            if (target?.linkedDocumentTypeId) {
                const flagFields: (keyof KeyNumberRow)[] = [
                    'hasExpiry', 'issueDateRequired', 'issueStateRequired', 'issueCountryRequired',
                ];
                const touchesFlags = flagFields.some(f => f in patch);
                if (touchesFlags) {
                    setDocuments(prevDocs => prevDocs.map(d =>
                        d.id === target.linkedDocumentTypeId ? { ...d, ...docFlagsFromKn(target) } : d,
                    ));
                }
            }
            return updated;
        });
    };

    /**
     * Bidirectional link: from a key number, point at a document. Mirrors
     * the document's compliance flags onto the key number, sets both id
     * references, and detaches whichever side either ref previously pointed
     * at so a key number / document only ever has one partner at a time.
     */
    const linkKeyToDoc = (keyNumberId: string, documentId: string) => {
        const doc = documents.find(d => d.id === documentId);
        if (!doc) return;
        // Detach any previous partner of the key number on the doc side, and
        // any previous partner of the document on the key-number side.
        setDocuments(prev => prev.map(d => {
            if (d.id === documentId) return { ...d, linkedKeyNumberId: keyNumberId };
            if (d.linkedKeyNumberId === keyNumberId) return { ...d, linkedKeyNumberId: undefined };
            return d;
        }));
        setKeyNumbers(prev => prev.map(k => {
            if (k.id === keyNumberId) return {
                ...k,
                docRequired: true,
                linkedDocumentTypeId: documentId,
                ...knFlagsFromDoc(doc),
            };
            if (k.linkedDocumentTypeId === documentId) return { ...k, linkedDocumentTypeId: undefined };
            return k;
        }));
    };

    /**
     * Bidirectional link from the document side. Resets any prior pairing.
     */
    const linkDocToKey = (documentId: string, keyNumberId: string) => {
        const kn = keyNumbers.find(k => k.id === keyNumberId);
        if (!kn) return;
        setKeyNumbers(prev => prev.map(k => {
            if (k.id === keyNumberId) return {
                ...k,
                docRequired: true,
                linkedDocumentTypeId: documentId,
            };
            if (k.linkedDocumentTypeId === documentId) return { ...k, linkedDocumentTypeId: undefined };
            return k;
        }));
        setDocuments(prev => prev.map(d => {
            if (d.id === documentId) {
                // A key-number link is independent of an expense/module link, so
                // preserve those display labels — only docs without one (or already
                // key-number-linked) adopt the legacy keynumber display label.
                const preserveDisplayLink = d.linkedType === 'expense' || d.linkedType === 'module';
                return {
                    ...d,
                    linkedKeyNumberId: keyNumberId,
                    ...(preserveDisplayLink ? {} : { linkedTo: kn.name, linkedType: 'keynumber' as const }),
                    ...docFlagsFromKn(kn),
                };
            }
            if (d.linkedKeyNumberId === keyNumberId) return { ...d, linkedKeyNumberId: undefined };
            return d;
        }));
    };

    /** Unlink from the key-number side: clear both refs. */
    const unlinkKeyDoc = (keyNumberId: string) => {
        const kn = keyNumbers.find(k => k.id === keyNumberId);
        const docId = kn?.linkedDocumentTypeId;
        setKeyNumbers(prev => prev.map(k =>
            k.id === keyNumberId
                ? { ...k, docRequired: false, linkedDocumentTypeId: undefined }
                : k));
        if (docId) {
            setDocuments(prev => prev.map(d =>
                d.id === docId ? { ...d, linkedKeyNumberId: undefined } : d));
        }
    };

    /** Unlink the key number from the document side. Preserves any expense/module
     *  display link — only clears the legacy label when it was the key number. */
    const unlinkDocKey = (documentId: string) => {
        const doc = documents.find(d => d.id === documentId);
        const knId = doc?.linkedKeyNumberId;
        setDocuments(prev => prev.map(d => {
            if (d.id !== documentId) return d;
            const clearDisplay = d.linkedType === 'keynumber';
            return {
                ...d,
                linkedKeyNumberId: undefined,
                ...(clearDisplay ? { linkedTo: undefined, linkedType: undefined } : {}),
            };
        }));
        if (knId) {
            setKeyNumbers(prev => prev.map(k =>
                k.id === knId ? { ...k, linkedDocumentTypeId: undefined } : k));
        }
    };

    const upsertKeyNumber = (row: KeyNumberRow) => {
        setKeyNumbers(prev => {
            const idx = prev.findIndex(r => r.id === row.id);
            if (idx === -1) return [row, ...prev];
            const next = [...prev];
            next[idx] = row;
            return next;
        });
        // Keep the document side of the link in sync so the pairing is bidirectional:
        // attach the chosen document's back-reference and detach any stale partner.
        setDocuments(prev => prev.map(d => {
            if (row.linkedDocumentTypeId && d.id === row.linkedDocumentTypeId) {
                return { ...d, linkedKeyNumberId: row.id, linkedTo: row.name, linkedType: 'keynumber' };
            }
            if (d.linkedKeyNumberId === row.id && d.id !== row.linkedDocumentTypeId) {
                return { ...d, linkedKeyNumberId: undefined };
            }
            return d;
        }));
        // Jump to the category the saved row belongs to so the user sees it land.
        setComplianceGroup(row.group);
        setFormState(null);
    };

    const deleteKeyNumber = (id: string) => {
        if (!window.confirm('Delete this key number?')) return;
        setKeyNumbers(prev => prev.filter(r => r.id !== id));
        // Cascade: clear the partner document's link if it pointed here.
        setDocuments(prev => prev.map(d =>
            d.linkedKeyNumberId === id ? { ...d, linkedKeyNumberId: undefined } : d));
    };

    const complianceTabs: SubTab<KeyNumberGroup | 'All'>[] = useMemo(
        () => [{ id: 'All', label: 'All' }, ...KEY_NUMBER_GROUPS.map(g => ({ id: g, label: g }))],
        [],
    );

    const filteredKeyNumbers = useMemo(
        () => keyNumbers.filter(r => complianceGroup === 'All' || r.group === complianceGroup),
        [keyNumbers, complianceGroup],
    );

    const filteredDocuments = useMemo(
        () => documents.filter(r => documentsTab === 'all' || r.scope === documentsTab),
        [documents, documentsTab],
    );

    // Early return: dedicated Add/Edit page replaces the list view entirely.
    if (formState) {
        return (
            <KeyNumberFormPage
                initial={formState.initial}
                isNew={formState.mode === 'add'}
                onSave={upsertKeyNumber}
                onCancel={() => setFormState(null)}
                documents={documents}
                onCreateDocument={upsertDocument}
            />
        );
    }
    if (docFormState) {
        return (
            <DocumentTypeFormPage
                initial={docFormState.initial}
                isNew={docFormState.mode === 'add'}
                onSave={upsertDocument}
                onCancel={() => setDocFormState(null)}
            />
        );
    }

    const pillBtn = (mode: PageMode, label: string) => (
        <button
            type="button"
            onClick={() => setPageMode(mode)}
            className={cn(
                "rounded-md px-4 py-1.5 text-[13px] font-semibold leading-5 transition-colors whitespace-nowrap",
                pageMode === mode
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900",
            )}
        >
            {label}
        </button>
    );

    return (
        <div className="flex h-full flex-col bg-slate-50/50">
            {/* ── Sticky header band ────────────────────────────────── */}
            <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
                <div className="px-6 pt-4">
                    <nav className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500" aria-label="Breadcrumb">
                        <span>Super Admin</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900">Compliance and Documents</span>
                    </nav>
                </div>

                <div className="px-6 pb-4 flex flex-wrap items-start justify-between gap-4">
                    {/* Left: title (+ subtitle in Compliance mode) */}
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {pageMode === 'compliance' ? 'Key Numbers' : pageMode === 'documents' ? 'Documents' : 'Document Tags'}
                        </h1>
                        {pageMode === 'compliance' && (
                            <p className="mt-0.5 text-sm text-slate-500">
                                Configure which numbers are tracked and their compliance rules.
                            </p>
                        )}
                    </div>

                    {/* Right: mode switch on top, contextual action button below */}
                    <div className="flex flex-col items-end gap-3">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                            {pillBtn('compliance', 'Compliance')}
                            {pillBtn('documents',  'Documents')}
                            {pillBtn('tags',       'Document Tags')}
                        </div>
                        {pageMode === 'compliance' && (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setAddMenuOpen(o => !o)}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Number to Category
                                    <ChevronDown className={cn(
                                        "h-3.5 w-3.5 opacity-80 transition-transform",
                                        addMenuOpen && "rotate-180",
                                    )} />
                                </button>
                                {addMenuOpen && (
                                    <AddCategoryMenu
                                        onPick={(group) => {
                                            setAddMenuOpen(false);
                                            setFormState({ mode: 'add', initial: newKeyNumberDraft(group) });
                                        }}
                                        onClose={() => setAddMenuOpen(false)}
                                    />
                                )}
                            </div>
                        )}
                        {pageMode === 'documents' && (
                            <button
                                type="button"
                                onClick={() => setDocFormState({ mode: 'add', initial: newDocumentDraft() })}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500"
                            >
                                <Plus className="h-4 w-4" /> Add Document Type
                            </button>
                        )}
                        {pageMode === 'tags' && (
                            <button
                                type="button"
                                onClick={() => setAddingTagSection(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500"
                            >
                                <Plus className="h-4 w-4" /> Add Document Tag
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs row — only for Compliance and Documents (Tags view spans full width). */}
                {pageMode !== 'tags' && (
                    <div className="border-t border-slate-100 bg-white px-6">
                        {pageMode === 'compliance' ? (
                            <SubTabs
                                tabs={complianceTabs}
                                activeId={complianceGroup}
                                onChange={(id) => setComplianceGroup(id)}
                                bordered={false}
                            />
                        ) : (
                            <SubTabs
                                tabs={DOCUMENTS_SUB_TABS}
                                activeId={documentsTab}
                                onChange={(id) => setDocumentsTab(id)}
                                bordered={false}
                            />
                        )}
                    </div>
                )}
            </header>

            {/* ── Body ─────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto px-6 py-6">
                {pageMode === 'compliance' && (
                    <KeyNumbersView
                        rows={filteredKeyNumbers}
                        allKeyNumbers={keyNumbers}
                        documents={documents}
                        onPatch={patchKeyNumber}
                        onPatchDocument={patchDocument}
                        onLinkDocument={linkKeyToDoc}
                        onUnlinkDocument={unlinkKeyDoc}
                        onEdit={(row) => setFormState({ mode: 'edit', initial: row })}
                        onDelete={deleteKeyNumber}
                    />
                )}
                {pageMode === 'documents' && (
                    <DocumentsView
                        rows={filteredDocuments}
                        total={documents.length}
                        allDocuments={documents}
                        keyNumbers={keyNumbers}
                        onPatch={patchDocument}
                        onPatchKeyNumber={patchKeyNumber}
                        onLinkKeyNumber={linkDocToKey}
                        onUnlinkKeyNumber={unlinkDocKey}
                        onEdit={(row) => setDocFormState({ mode: 'edit', initial: row })}
                        onDelete={deleteDocument}
                    />
                )}
                {pageMode === 'tags' && (
                    <DocumentTagsView
                        externalAdding={addingTagSection}
                        onExternalAddingChange={setAddingTagSection}
                    />
                )}
            </main>
        </div>
    );
};

export default ComplianceAndDocumentsPage;
