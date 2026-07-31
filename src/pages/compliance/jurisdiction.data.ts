/**
 * Shared country / state-province lists for the compliance forms
 * (SafetyCatalogView settings form + DefaultComplianceDataPage data modal).
 *
 * COUNTRIES     — the three North-American operating countries (default).
 * ALL_COUNTRIES — a full world list, used where a record can be issued anywhere
 *                 (e.g. Passport → `allCountries` on the SafetyRecord).
 */

export const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
    'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming',
];

export const CA_PROVINCES = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan',
    'Northwest Territories', 'Nunavut', 'Yukon',
];

export const MX_STATES = ['Baja California', 'Chihuahua', 'Coahuila', 'Nuevo León', 'Sonora', 'Tamaulipas'];

/** Default operating countries. */
export const COUNTRIES = ['United States', 'Canada', 'Mexico'];

export const STATES_BY_COUNTRY: Record<string, string[]> = {
    'United States': US_STATES,
    'Canada': CA_PROVINCES,
    'Mexico': MX_STATES,
};

/** Full world country list (North-American three first, then alphabetical). */
export const ALL_COUNTRIES = [
    'United States', 'Canada', 'Mexico',
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium',
    'Bolivia', 'Brazil', 'Bulgaria', 'Cameroon', 'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia',
    'Cuba', 'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
    'Estonia', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Haiti',
    'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
    'Jamaica', 'Japan', 'Jordan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania', 'Malaysia',
    'Morocco', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Nigeria', 'Norway', 'Pakistan',
    'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Romania',
    'Russia', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'Somalia', 'South Africa',
    'South Korea', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Thailand',
    'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
    'Uruguay', 'Venezuela', 'Vietnam', 'Yemen', 'Zimbabwe',
];

export function countryList(allCountries?: boolean): string[] {
    return allCountries ? ALL_COUNTRIES : COUNTRIES;
}

/** Best-effort parse of a jurisdiction string into { country, state } to pre-fill selectors. */
export function parseJurisdiction(j: string): { country: string; state: string } {
    const lower = j.toLowerCase();
    let country = '';
    if (lower.includes('canada')) country = 'Canada';
    else if (lower.includes('mexico') && !lower.includes('new mexico')) country = 'Mexico';
    else if (lower.includes('united states') || lower.includes('u.s') || /\bus\b/.test(lower) || lower.includes('federal')) country = 'United States';
    for (const [ctry, states] of Object.entries(STATES_BY_COUNTRY)) {
        const hit = states.find(s => lower.includes(s.toLowerCase()));
        if (hit) return { country: country || ctry, state: hit };
    }
    return { country, state: '' };
}
