// ─────────────────────────────────────────────────────────────────────────────
// How an asset is HELD, captured on the Add Asset form → the asset's COMPLIANCE
// RECORD.
//
// The Ownership & Financial Profile section already asks the question this turns
// on: is the vehicle owned, leased, financed or rented. Every one of those
// answers is proved by a document — a bill of sale, or the agreement it runs
// under — and those documents are Compliance & Documents records on the asset,
// not fields on the asset. Leaving them to be re-entered on the compliance side
// means the office types the lease company, the term and the monthly payment
// twice, and the second copy is the one that goes out of date.
//
// So the ownership structure picks the record, and the form asks for exactly
// what that record declares MINUS what the asset form already knows (`supplied`):
// no field is asked for twice, and nothing the record captures is dropped.
//
// Nothing here knows about React — the section renders from `ownershipCardFields()`
// and the save path calls `commitOwnershipDoc` once the asset has an id.
// ─────────────────────────────────────────────────────────────────────────────

import {
    SAFETY_RECORDS, recordForFields, recordFields, isDateMonitored, defaultVersionLabel,
    type SafetyRecord, type RecordTextField,
} from '@/pages/compliance/safety-software-catalog.data';
import {
    blankVersion, defaultMonitoring, writeComplianceVersion,
    type DataDocFile, type DocVersion, type MonitoringConfig,
} from '@/pages/compliance/compliance-data-store';
import { COUNTRIES, STATES_BY_COUNTRY } from '@/pages/compliance/jurisdiction.data';
import { findUserById } from '@/data/users.data';

/** The ownership structures the asset form offers — `assetSchema.financialStructure`. */
export const OWNERSHIP_STRUCTURES = ['Owned', 'Leased', 'Financed', 'Rented'] as const;
export type OwnershipStructure = typeof OWNERSHIP_STRUCTURES[number];

/**
 * Which record each answer files, and what it arrives knowing.
 *
 * `fields` is what the structure has ALREADY settled — choosing "Leased" on the asset form is
 * choosing a Lease Agreement, so the record's type question is answered rather than asked
 * again two inches below the answer.
 *
 * `supplied` names the record's own fields the asset form fills in from its existing inputs.
 * They are still the record's fields and still filed on it; they are simply not asked twice.
 */
interface OwnershipSpec {
    recordId: string;
    fields: Record<string, string>;
    supplied: string[];
    /** The record's start / end dates come from the asset form's agreement term. */
    datesFromTerm: boolean;
}

/** The address block the ownership section already carries, in the record's own field keys. */
const ADDRESS_SUPPLIED = ['addressLine', 'addressCity', 'addressPostal'];

const OWNERSHIP_SPEC: Record<OwnershipStructure, OwnershipSpec> = {
    // Owned has no counterparty on the asset form: the carrier IS the owner, so the section
    // asks for no name and no address. The seller it was bought from, and the seller's address,
    // are asked on the bill of sale itself — which is the document they are written on.
    Owned: { recordId: 'bill-of-sale', fields: {}, supplied: [], datesFromTerm: false },
    Leased: { recordId: 'asset-agreement', fields: { agreementType: 'Lease Agreement' }, supplied: ['counterparty', 'monthlyAmount', ...ADDRESS_SUPPLIED], datesFromTerm: true },
    Financed: { recordId: 'asset-agreement', fields: { agreementType: 'Finance Agreement' }, supplied: ['counterparty', 'monthlyAmount', ...ADDRESS_SUPPLIED], datesFromTerm: true },
    Rented: { recordId: 'asset-agreement', fields: { agreementType: 'Rental Agreement' }, supplied: ['counterparty', 'monthlyAmount', ...ADDRESS_SUPPLIED], datesFromTerm: true },
};

export const isOwnershipStructure = (s: string): s is OwnershipStructure =>
    (OWNERSHIP_STRUCTURES as readonly string[]).includes(s);

const specFor = (structure: string): OwnershipSpec | undefined =>
    (isOwnershipStructure(structure) ? OWNERSHIP_SPEC[structure] : undefined);

/**
 * The record an ownership structure files, resolved to the KIND it is — a lease agreement, not
 * the three-named record it is one of. Every label the form shows (the document's name, what
 * its dates are called) comes off this, so the section says "Lease start date" because the
 * catalog does, not because the section spells it out again.
 */
export function ownershipRecordFor(structure: string): SafetyRecord | null {
    const spec = specFor(structure);
    const base = spec && SAFETY_RECORDS.find(r => r.id === spec.recordId);
    return base ? recordForFields(base, spec!.fields) : null;
}

/** The catalog record itself (the union), for writing — versions are stored against the base. */
const baseRecordFor = (structure: string): SafetyRecord | undefined => {
    const spec = specFor(structure);
    return spec ? SAFETY_RECORDS.find(r => r.id === spec.recordId) : undefined;
};

/**
 * What a filed ownership document is called by default: the answer the structure gave. A leased
 * truck files a "Lease Agreement", not the record's own three-way name — and an owned one files
 * a "Bill of Sale". Both are names the catalog itself recognises as automatic, so changing the
 * ownership structure renames the document, while a name the user typed is left alone.
 */
export function ownershipDocLabel(structure: string): string {
    const spec = specFor(structure);
    const record = ownershipRecordFor(structure);
    if (!spec || !record) return '';
    return Object.values(spec.fields)[0] ?? defaultVersionLabel(record);
}

/**
 * The fields the ownership CARD asks for: everything the record declares, minus what the asset
 * form has already been told. Derived rather than listed, so a field added to either record
 * appears on the Add Asset form without this file being touched.
 */
export function ownershipCardFields(structure: string): RecordTextField[] {
    const spec = specFor(structure);
    const record = ownershipRecordFor(structure);
    if (!spec || !record) return [];
    const out: RecordTextField[] = [];
    for (const f of recordFields(record)) {
        if (f.kind !== 'text' || spec.supplied.includes(f.key)) continue;
        out.push(f);
    }
    return out;
}

/** One ownership document as the Add Asset form holds it. */
export interface OwnershipDocCapture {
    /** What the filed record is called — seeded with the catalog's own default name. */
    label: string;
    /** The record's own field values, keyed by field key (a money field's currency included). */
    fields: Record<string, string>;
    /** Uploaded documents (the prototype keeps names and sizes, as the hiring capture does). */
    files: { name: string; size: number }[];
    /** The alert this becomes once it is a compliance record. */
    monitoring: MonitoringConfig;
}

/** A blank capture for one ownership structure, named and armed the way the record says. */
export function emptyOwnershipDoc(structure: string): OwnershipDocCapture {
    const record = ownershipRecordFor(structure);
    const dated = !!record && isDateMonitored(record) && !record.hideMonitoring;
    return {
        label: ownershipDocLabel(structure),
        fields: {},
        files: [],
        // Armed where the record says so — an agreement that runs out is exactly the thing
        // nobody should have to remember to switch an alert on for.
        monitoring: { ...defaultMonitoring(), enabled: dated && !!record?.monitorByDefault, basis: 'expiry' },
    };
}

/** What the asset form itself is holding that belongs on the document. */
export interface OwnershipSource {
    financialStructure?: string;
    ownerName?: string;
    leasingName?: string;
    lienHolderBusiness?: string;
    rentalAgencyName?: string;
    agreementStartDate?: string;
    agreementEndDate?: string;
    monthlyPayment?: number;
    monthlyPaymentCurrency?: string;
    /** The Address Details block in the ownership section — the other party's address. */
    streetAddress?: string;
    city?: string;
    country?: string;
    stateProvince?: string;
    zipCode?: string;
    ownershipDoc?: OwnershipDocCapture;
}

/**
 * The asset form's country, as the compliance record spells it. The two lists write the same
 * country differently ('USA' against 'United States'), and a country the record's select cannot
 * show reads as blank — so it is translated rather than copied, and anything unrecognised is
 * left empty rather than filed as a country that does not exist.
 */
function complianceCountry(country: string | undefined): string {
    const c = (country ?? '').trim();
    if (!c) return '';
    if (c === 'USA' || c === 'US') return 'United States';
    return COUNTRIES.includes(c) ? c : '';
}

/** Where one of a record's amount fields keeps its currency — read from the field, never assumed. */
function moneyCurrencyKey(record: SafetyRecord, key: string): string | undefined {
    for (const f of recordFields(record)) {
        if (f.kind === 'text' && f.key === key) return f.money?.currencyKey;
    }
    return undefined;
}

/** The counterparty the asset form names, which differs by structure. */
function counterpartyOf(asset: OwnershipSource): string {
    switch (asset.financialStructure) {
        case 'Leased': return asset.leasingName ?? '';
        case 'Financed': return asset.lienHolderBusiness ?? '';
        case 'Rented': return asset.rentalAgencyName ?? '';
        default: return '';
    }
}

/**
 * The record fields the asset form supplies — the company it is with, and what it costs a
 * month. Only the keys the spec says are supplied, so a record that stops declaring one stops
 * receiving it.
 */
function suppliedFields(structure: string, asset: OwnershipSource): Record<string, string> {
    const spec = specFor(structure);
    const record = ownershipRecordFor(structure);
    if (!spec || !record) return {};
    const currencyKey = moneyCurrencyKey(record, 'monthlyAmount');
    const out: Record<string, string> = {};
    for (const key of spec.supplied) {
        if (key === 'counterparty') {
            const name = counterpartyOf(asset).trim();
            if (name) out.counterparty = name;
        }
        if (key === 'monthlyAmount' && typeof asset.monthlyPayment === 'number' && asset.monthlyPayment > 0) {
            out.monthlyAmount = String(asset.monthlyPayment);
            // An amount without its currency is not a value — they travel together or not at all.
            if (currencyKey) out[currencyKey] = asset.monthlyPaymentCurrency ?? 'USD';
        }
        if (key === 'addressLine' && asset.streetAddress?.trim()) out.addressLine = asset.streetAddress.trim();
        if (key === 'addressCity' && asset.city?.trim()) out.addressCity = asset.city.trim();
        if (key === 'addressPostal' && asset.zipCode?.trim()) out.addressPostal = asset.zipCode.trim();
    }
    return out;
}

/**
 * True once the card carries something worth filing.
 *
 * Deliberately blind to the asset form's OWN fields: a leased asset always has a company and a
 * term, so counting those would file a fresh copy of the agreement every time anybody edits the
 * asset and saves. The card is the "add record" action — a document, an address, a price or a
 * name typed into it — and an untouched card files nothing.
 */
export function ownershipDocHasContent(structure: string, c: OwnershipDocCapture | undefined): boolean {
    if (!c) return false;
    if (c.files.length > 0) return true;
    if (ownershipCardFields(structure).some(f => (c.fields?.[f.key] ?? '').trim())) return true;
    return c.label.trim() !== '' && c.label.trim() !== ownershipDocLabel(structure);
}

/** Current signed-in user's display name — the same stamp the compliance page applies. */
function capturedByName(): string {
    try { const id = localStorage.getItem('app_current_user_id'); return (id && findUserById(id)?.name) || 'You'; } catch { return 'You'; }
}

/**
 * One captured ownership document → the version filed against the asset, or null when there is
 * nothing to file. Only the keys the record still declares are carried over, so a value left
 * behind by a changed ownership structure cannot leak onto the document.
 */
export function ownershipDocVersion(asset: OwnershipSource, capturedBy?: string): DocVersion | null {
    const structure = asset.financialStructure ?? '';
    const spec = specFor(structure);
    const base = baseRecordFor(structure);
    const record = ownershipRecordFor(structure);
    const c = asset.ownershipDoc;
    if (!spec || !base || !record || !c || !ownershipDocHasContent(structure, c)) return null;

    // Named by the user, falling back to the catalog default — a record cannot be filed
    // nameless, and a name cleared to blank should not be what the office finds it under.
    const v = blankVersion(base, c.label?.trim() || ownershipDocLabel(structure));
    // The address block's country and province, in the record's own spelling. The province is
    // checked against the country it is under: switching the country on the asset form leaves
    // the old province selected, and a province from the wrong country is a value the record's
    // form cannot show.
    v.country = complianceCountry(asset.country);
    const provinces = STATES_BY_COUNTRY[v.country] ?? [];
    v.stateProv = provinces.includes(asset.stateProvince ?? '') ? (asset.stateProvince ?? '') : '';
    // The agreement's term; a bill of sale has neither date and must not carry one.
    v.issueDate = spec.datesFromTerm && record.tracksIssueDate ? (asset.agreementStartDate ?? '') : '';
    v.expiryDate = spec.datesFromTerm && isDateMonitored(record) ? (asset.agreementEndDate ?? '') : '';

    // What the structure settled, what the asset form knows, and what the card was told —
    // in that order, so anything typed on the card wins. Then narrowed to what the record
    // actually declares, currency companions included.
    const declared = new Set<string>();
    for (const f of recordFields(record)) {
        declared.add(f.key);
        if (f.kind === 'text' && f.money) declared.add(f.money.currencyKey);
    }
    const merged = { ...spec.fields, ...suppliedFields(structure, asset), ...(c.fields ?? {}) };
    const fields: Record<string, string> = {};
    for (const [k, val] of Object.entries(merged)) if (declared.has(k) && val.trim()) fields[k] = val.trim();
    if (Object.keys(fields).length) v.fields = fields;

    const now = new Date().toISOString();
    v.files = c.files.map((f): DataDocFile => ({ name: f.name, size: f.size, uploadedAt: now }));
    // Tagged with where it came from: on the compliance list this is the difference between a
    // document the office filed and one captured while the asset was being registered.
    v.tags = ['From asset form'];
    v.uploadedBy = capturedBy || capturedByName();
    v.monitoring = {
        ...(c.monitoring ?? defaultMonitoring()),
        // Never without a date to count back from: an alert on a blank end date fires on nothing.
        enabled: !record.hideMonitoring && isDateMonitored(record) && (c.monitoring?.enabled ?? false) && !!v.expiryDate,
    };
    return v;
}

/**
 * File the captured ownership document as the asset's compliance record. Called once the asset
 * has an id — on Add Asset that is only after the list assigns one.
 *
 * Returns what was filed, for the confirmation the user sees, or null when the card was left
 * untouched. Existing versions are kept: this prepends, so re-registering the same asset under
 * a new agreement files the newer document over the older one rather than replacing history.
 */
export function commitOwnershipDoc(
    accountId: string | undefined, assetId: string, asset: OwnershipSource, capturedBy?: string,
): string | null {
    if (!assetId) return null;
    const base = baseRecordFor(asset.financialStructure ?? '');
    const version = ownershipDocVersion(asset, capturedBy);
    if (!base || !version) return null;
    writeComplianceVersion(accountId, assetId, base.id, version);
    return version.label;
}
