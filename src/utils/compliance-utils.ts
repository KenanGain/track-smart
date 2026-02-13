import type { KeyNumberConfig } from '@/types/key-numbers.types';
import type { DocumentType } from '@/data/mock-app-data';
import type { Asset } from '@/pages/assets/assets.data';

export type ComplianceStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Missing' | 'Incomplete' | 'Optional' | 'N/A' | 'Not Uploaded';

/**
 * Calculates the compliance status based on an expiry date and monitoring configuration.
 * 
 * @param expiryDate - The ISO string date of expiration (or null/undefined).
 * @param monitoringEnabled - Whether monitoring is enabled for this item.
 * @param maxReminderDays - The largest active reminder threshold (e.g., 90 if d90 is true). 
 *                        If monitoring is disabled, this is ignored.
 * @param hasValue - Whether the underlying value (document or key number) exists.
 * @param hasExpiry - Whether the item is configured to require an expiry date.
 * @param isRequired - Whether the item is mandatory.
 * @returns ComplianceStatus string
 */
export function calculateComplianceStatus(
    expiryDate: string | null | undefined,
    monitoringEnabled: boolean,
    maxReminderDays: number,
    hasValue: boolean, // e.g., document uploaded or number entered
    hasExpiry: boolean, // e.g., config.hasExpiry
    isRequired: boolean = true
): ComplianceStatus {

    if (!hasValue) {
        return isRequired ? 'Missing' : 'Optional';
    }

    if (hasExpiry) {
        if (!expiryDate) {
            return 'Incomplete';
        }

        const today = new Date();
        // Reset time to start of day for accurate day diff
        today.setHours(0, 0, 0, 0);
        
        const exp = new Date(expiryDate);
        // exp.setHours(0,0,0,0); // Optional: depends on if expiry is inclusive

        const diffTime = exp.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return 'Expired';
        }

        // If monitoring is enabled, use the max reminder setting.
        // If disabled, what is the default? Usually we still show "Expiring Soon" at some point?
        // Or does "Monitoring Disabled" mean "Never warn me"?
        // Requirement: "If !enabled, fallback to default (30 days)." from plan.
        const threshold = monitoringEnabled ? maxReminderDays : 30;

        if (diffDays <= threshold) {
            return 'Expiring Soon';
        }

        return 'Active';
    }

    return 'Active';
}

/**
 * Extracts the maximum reminder day threshold from a KeyNumberConfig or DocumentType.
 */
export function getMaxReminderDays(config: KeyNumberConfig | DocumentType | any): number {
    let reminders: any = {};
    let enabled = true;

    if ('monitoring' in config && config.monitoring) {
        // DocumentType style
        reminders = config.monitoring.reminders;
        enabled = config.monitoring.enabled;
    } else if ('monitoringEnabled' in config) {
        // KeyNumberConfig style (flat)
        // Wait, KeyNumberConfig types in key-numbers.types.ts:
        // reminderDays?: Record<number, boolean>;
        reminders = config.reminderDays || {};
        enabled = config.monitoringEnabled ?? true;
    } else {
        // Fallback or unknown shape
        return 30;
    }

    if (!enabled) return 30; // Fallback if disabled, though caller usually handles enabled check

    // Normalize reminders to array of days
    const days: number[] = [];

    // Data shape 1: { d90: true, d60: false } (DocumentType)
    if (reminders.d90) days.push(90);
    if (reminders.d60) days.push(60);
    if (reminders.d30) days.push(30);
    if (reminders.d7) days.push(7);

    // Data shape 2: { 90: true, 60: false } (KeyNumberConfig potentially)
    // The interface says Record<number, boolean>, so check keys
    Object.keys(reminders).forEach(k => {
        if (k.startsWith('d')) return; // handled above
        const day = parseInt(k);
        if (!isNaN(day) && reminders[day]) {
            days.push(day);
        }
    });

    if (days.length === 0) return 30; // Default if enabled but no reminders checked? Or 0? Let's say 30.

    return Math.max(...days);
}

export function isMonitoringEnabled(config: KeyNumberConfig | DocumentType | any): boolean {
    if ('monitoring' in config && config.monitoring) {
        return config.monitoring.enabled;
    }
    if ('monitoringEnabled' in config) {
        return config.monitoringEnabled ?? true;
    }
    return true; // Default
}

/**
 * Calculates aggregated compliance statistics for a driver.
 */
export function calculateDriverComplianceStats(
    driverData: any,
    keyNumbersConfig: KeyNumberConfig[],
    documentsConfig: any[]
) {
    let total = 0, expired = 0, expiring = 0, missingNumber = 0, missingExpiry = 0, missingDoc = 0;

    // 1. Key Numbers Compliance
    const driverKeyNumbers = keyNumbersConfig?.filter(
        (kn: KeyNumberConfig) => kn.entityType === 'Driver' && kn.status === 'Active'
    ) || [];

    driverKeyNumbers.forEach((kn: KeyNumberConfig) => {
        let driverKn = driverData.keyNumbers?.find((k: any) => k.configId === kn.id);
        
        // Handle Virtual Driver License
        if (kn.id === 'kn-driver-license' && driverData.licenses) {
             const primary = driverData.licenses.find((l: any) => l.isPrimary) || driverData.licenses[0];
             if (primary) {
                 driverKn = {
                     configId: kn.id,
                     value: primary.licenseNumber,
                     expiryDate: primary.expiryDate,
                     hasUpload: !!(primary.frontImage || primary.pdfDoc || primary.rearImage) // Approximation
                 };
             }
        }

        const value = driverKn?.value || '';
        const expiryDate = driverKn?.expiryDate || null;
        const hasValue = !!value && value !== '';

        const enabled = isMonitoringEnabled(kn);
        const maxDays = getMaxReminderDays(kn);
        const status = calculateComplianceStatus(expiryDate, enabled, maxDays, hasValue, kn.hasExpiry, kn.numberRequired ?? true);

        if (status === 'Expired') expired++;
        else if (status === 'Expiring Soon') expiring++;
        else if (status === 'Missing') missingNumber++;
        else if (status === 'Incomplete') missingExpiry++;
        total++;
    });

    // 2. Documents Compliance
    // Filter for required driver documents
    const driverDocTypes = documentsConfig?.filter((doc: any) => doc.relatedTo === 'driver' && doc.requirementLevel === 'required') || [];
    
    driverDocTypes.forEach((docType: any) => {
        // Check if driver has this document uploaded
        const existingDoc = driverData.documents?.find((d: any) => d.typeId === docType.id);
        
        // A document is missing if:
        // 1. It's not found in driverData.documents OR
        // 2. It exists but hasUpload is false (if that flag is used)
        // In the View, it checks !existingDoc || !existingDoc.hasUpload
        if (!existingDoc || !existingDoc.hasUpload) {
            missingDoc++;
        } else {
             // Optional: Check if the document itself is expired?
             // The view logic primarily counted 'missingDoc'.
             // If you want to count expired docs, check existingDoc.expiryDate with calculateComplianceStatus logic.
             // For now, matching the View's logic which counts missing docs.
        }
    });

    return { total, expired, expiring, missingNumber, missingExpiry, missingDoc };
}

/**
 * Calculates aggregated compliance statistics for an asset.
 * Checks defined compliance items (Registration, etc.)
 * 
 * Rule:
 * An item is "Missing" if ANY of the following are missing:
 * - Document (if required)
 * - Key Number (if required)
 * - Expiry Date (if required)
 * - Issue Date (if required)
 * 
 * Otherwise, check Expiry status.
 */
export function calculateAssetComplianceStats(asset: Asset) {
    let missing = 0;
    let expired = 0;
    let expiringSoon = 0;

    // Define Items to Check
    const items = [
        {
            name: 'Registration',
            enabled: asset.plateMonitoringEnabled ?? true,
            required: true, // Registration is generally required for an asset
            fields: {
                number: asset.plateNumber,
                document: (asset as any).plateDocument, // check array length > 0
                expiryDate: asset.registrationExpiryDate,
                issueDate: asset.registrationIssueDate
            },
            reminderSchedule: asset.plateReminderSchedule
        },
        {
            name: 'Transponder',
            enabled: asset.transponderMonitoringEnabled ?? false,
            // Only required if we want to enforce it, but typically optional unless specified.
            // However, if enabled/monitoring is ON, we usually expect data.
            // Let's assume if monitoring is enabled, we expect completeness.
            required: asset.transponderMonitoringEnabled ?? false, 
            fields: {
                number: asset.transponderNumber,
                document: (asset as any).transponderDocument,
                expiryDate: asset.transponderExpiryDate,
                issueDate: asset.transponderIssueDate
            },
            reminderSchedule: asset.transponderReminderSchedule
        }
    ];

    items.forEach(item => {
        if (!item.enabled && !item.required) return;

        // Check for "Missing" (Any required field missing)
        // For Transponder, if it's enabled, we likely require the number/doc/dates if we are tracking it.
        
        const hasNumber = !!item.fields.number;
        const hasDoc = item.fields.document && item.fields.document.length > 0;
        const hasExpiry = !!item.fields.expiryDate;
        const hasIssue = !!item.fields.issueDate;

        // Rule: If "Missing any of this document, keynumber, expiry, issue date" -> Tag as Missing
        const isMissing = !hasNumber || !hasDoc || !hasExpiry || !hasIssue;

        if (isMissing) {
            missing++;
        } else {
            // All fields present, check expiry
            const status = calculateComplianceStatus(
                item.fields.expiryDate,
                true,
                Math.max(...(item.reminderSchedule || [30])),
                true, // hasValue (we confirmed above)
                true, // hasExpiry
                true // isRequired
            );

            if (status === 'Expired') expired++;
            else if (status === 'Expiring Soon') expiringSoon++;
        }
    });

    return {
        missing,
        expired,
        expiringSoon,
        totalIssues: missing + expired + expiringSoon
    };
}
