export type ServiceCategory = 'cmv_only' | 'non_cmv_only' | 'both_cmv_and_non_cmv';

export type ServiceComplexity = "Basic" | "Moderate" | "Extensive" | "Intensive";

export interface ServiceType {
    id: string;
    name: string; // "Maintenance Type"
    category: ServiceCategory; // "Applicability"
    group: string; // "Maintenance Class" — one of the 7 ServiceGroup values
    complexity?: ServiceComplexity;
    description?: string;
}

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
    'cmv_only': 'CMV Only',
    'non_cmv_only': 'Non-CMV Only',
    'both_cmv_and_non_cmv': 'All Vehicles'
};
