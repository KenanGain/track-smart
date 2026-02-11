import type { KeyNumberConfig } from '@/types/key-numbers.types';
import type { DocumentType } from '@/data/mock-app-data';

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
