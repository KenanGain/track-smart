export type ServiceCategory = 'cmv_only' | 'non_cmv_only' | 'both_cmv_and_non_cmv';

export type ServiceGroup = "Engine" | "Tires & Brakes" | "Inspections" | "General";

export interface ServiceType {
    id: string;
    name: string;
    category: ServiceCategory;
    group: ServiceGroup;
}

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
    'cmv_only': 'CMV Only',
    'non_cmv_only': 'Non-CMV Only',
    'both_cmv_and_non_cmv': 'All Vehicles'
};
