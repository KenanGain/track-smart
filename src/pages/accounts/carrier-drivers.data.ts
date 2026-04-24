// Per-carrier Driver Database
//
// Dedicated data file for carrier drivers. Builds `CARRIER_DRIVERS` keyed by
// account id at module load, with exactly `account.drivers` records per
// carrier. Records are region-aware (English / Hispanic / French-Canadian /
// South-Asian name pools weighted by US state or CA province), with full
// contact, license, emergency contact, prior employment, and travel-document
// fields — enough to populate the Driver Profile detail view.

import { ACCOUNTS_DB, type AccountRecord } from './accounts.data';
import { MOCK_DRIVER_DETAILED_TEMPLATE, type Driver } from '@/pages/profile/carrier-profile.data';
import { hash, mulberry32, pick, pickWeighted, pad, areaCodeFor } from './carrier-fleet-shared.data';

// ─── Name pools (region-aware) ───────────────────────────────────────────────

const FIRST_NAMES_EN = [
    'James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles',
    'Christopher','Daniel','Matthew','Anthony','Mark','Donald','Steven','Paul','Andrew','Joshua',
    'Kevin','Brian','George','Edward','Ronald','Timothy','Jason','Jeffrey','Ryan','Jacob',
    'Mary','Patricia','Jennifer','Linda','Elizabeth','Barbara','Susan','Jessica','Sarah','Karen',
    'Nancy','Lisa','Betty','Margaret','Sandra','Ashley','Kimberly','Emily','Donna','Michelle',
    'Tyler','Austin','Logan','Connor','Hunter','Cole','Dylan','Ethan','Hayden','Brandon',
];
const LAST_NAMES_EN = [
    'Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Wilson','Anderson','Taylor',
    'Thomas','Jackson','White','Harris','Martin','Thompson','Young','Allen','King','Wright',
    'Scott','Green','Adams','Baker','Nelson','Hill','Campbell','Mitchell','Roberts','Carter',
    'Phillips','Evans','Turner','Parker','Collins','Edwards','Stewart','Morris','Murphy','Cook',
    'Rogers','Reed','Cooper','Peterson','Bailey','Kelly','Howard','Ward','Cox','Richardson',
    'Brooks','Hughes','Price','Bennett','Foster','Watson','Russell','Sanders','Powell','Long',
];
const FIRST_NAMES_ES = [
    'Carlos','Juan','Miguel','Jose','Luis','Rafael','Antonio','Manuel','Francisco','Pedro',
    'Ricardo','Eduardo','Fernando','Roberto','Daniel','Alejandro','Sergio','Diego','Gabriel','Rodrigo',
    'Maria','Sofia','Elena','Isabella','Camila','Valentina','Lucia','Ana','Carmen','Rosa',
];
const LAST_NAMES_ES = [
    'Garcia','Martinez','Rodriguez','Hernandez','Lopez','Gonzalez','Perez','Sanchez','Ramirez','Torres',
    'Flores','Rivera','Gomez','Diaz','Reyes','Morales','Ortiz','Cruz','Gutierrez','Chavez',
    'Ramos','Ruiz','Alvarez','Mendoza','Vazquez','Castillo','Jimenez','Moreno','Romero','Navarro',
];
const FIRST_NAMES_FR = [
    'Pierre','Jean','Luc','Louis','Claude','Marc','Guy','Gilles','Yves','Andre',
    'Michel','Philippe','Denis','Martin','Daniel','Alain','Christian','Benoit','Mathieu','Nicolas',
    'Marie','Louise','Claire','Sophie','Nathalie','Catherine','Isabelle','Sylvie','Julie','Anne',
];
const LAST_NAMES_FR = [
    'Tremblay','Gagnon','Roy','Cote','Bouchard','Gauthier','Morin','Lavoie','Fortin','Gagne',
    'Ouellet','Pelletier','Belanger','Levesque','Bergeron','Leblanc','Paquette','Girard','Simard','Boucher',
    'Caron','Beaulieu','Cloutier','Dubois','Poirier','Fournier','Lapointe','Leclerc','Lemieux','Mercier',
];
const FIRST_NAMES_SA = [
    'Raj','Vikram','Arjun','Rohan','Sanjay','Anil','Ravi','Amit','Sandeep','Karan',
    'Deepak','Manoj','Ankit','Priya','Anjali','Neha','Pooja','Kavita','Meera','Divya',
];
const LAST_NAMES_SA = [
    'Patel','Singh','Sharma','Kumar','Shah','Gupta','Khan','Agarwal','Kaur','Malhotra',
    'Mehta','Kapoor','Chopra','Bhatia','Desai','Iyer','Nair','Reddy','Sinha','Verma',
];

// Regional mix per state / province → weights sum to ~1.
const REGION_MIX: Record<string, { en: number; es: number; fr: number; sa: number }> = {
    TX: { en: 0.55, es: 0.40, fr: 0, sa: 0.05 },
    CA: { en: 0.55, es: 0.35, fr: 0, sa: 0.10 },
    AZ: { en: 0.55, es: 0.40, fr: 0, sa: 0.05 },
    NM: { en: 0.40, es: 0.55, fr: 0, sa: 0.05 },
    FL: { en: 0.60, es: 0.35, fr: 0, sa: 0.05 },
    NV: { en: 0.65, es: 0.30, fr: 0, sa: 0.05 },
    IL: { en: 0.70, es: 0.20, fr: 0, sa: 0.10 },
    MI: { en: 0.80, es: 0.10, fr: 0, sa: 0.10 },
    OH: { en: 0.85, es: 0.10, fr: 0, sa: 0.05 },
    PA: { en: 0.85, es: 0.10, fr: 0, sa: 0.05 },
    NY: { en: 0.70, es: 0.20, fr: 0, sa: 0.10 },
    NJ: { en: 0.65, es: 0.25, fr: 0, sa: 0.10 },
    GA: { en: 0.80, es: 0.15, fr: 0, sa: 0.05 },
    LA: { en: 0.85, es: 0.10, fr: 0.05, sa: 0 },
    NC: { en: 0.85, es: 0.10, fr: 0, sa: 0.05 },
    OR: { en: 0.80, es: 0.15, fr: 0, sa: 0.05 },
    WA: { en: 0.75, es: 0.15, fr: 0, sa: 0.10 },
    CO: { en: 0.75, es: 0.20, fr: 0, sa: 0.05 },
    UT: { en: 0.85, es: 0.10, fr: 0, sa: 0.05 },
    MA: { en: 0.85, es: 0.10, fr: 0, sa: 0.05 },
    IN: { en: 0.90, es: 0.05, fr: 0, sa: 0.05 },
    IA: { en: 0.90, es: 0.05, fr: 0, sa: 0.05 },
    MO: { en: 0.90, es: 0.05, fr: 0, sa: 0.05 },
    MN: { en: 0.90, es: 0.05, fr: 0, sa: 0.05 },
    ID: { en: 0.90, es: 0.05, fr: 0, sa: 0.05 },
    NE: { en: 0.90, es: 0.05, fr: 0, sa: 0.05 },
    DE: { en: 0.80, es: 0.10, fr: 0, sa: 0.10 },
    ON: { en: 0.55, es: 0.05, fr: 0.10, sa: 0.30 },
    QC: { en: 0.15, es: 0.05, fr: 0.75, sa: 0.05 },
    BC: { en: 0.65, es: 0.05, fr: 0.05, sa: 0.25 },
    AB: { en: 0.75, es: 0.05, fr: 0.05, sa: 0.15 },
    MB: { en: 0.80, es: 0.05, fr: 0.05, sa: 0.10 },
    SK: { en: 0.85, es: 0.05, fr: 0.05, sa: 0.05 },
};

function mixFor(state: string): { en: number; es: number; fr: number; sa: number } {
    return REGION_MIX[state] ?? { en: 0.85, es: 0.10, fr: 0, sa: 0.05 };
}

// ─── Supporting pools ───────────────────────────────────────────────────────

const STREET_NAMES = [
    'Commerce Blvd', 'Industrial Pkwy', 'Logistics Way', 'Freight Ave', 'Terminal Rd',
    'Depot St', 'Warehouse Ln', 'Distribution Dr', 'Fleet Rd', 'Carrier Ct',
    'Dispatch Dr', 'Loading Dock Rd', 'Port St', 'Transit Way', 'Interstate Blvd',
    'Main St', 'Oak Ave', 'Maple Dr', 'Elm St', 'Pine Rd', 'Cedar Ln', 'Birch Way',
];

const PRIOR_EMPLOYERS = [
    'Swift Transportation', 'J.B. Hunt Transport', 'Werner Enterprises', 'Schneider National',
    'Knight-Swift', 'XPO Logistics', 'Old Dominion Freight Line', 'Yellow Corp',
    'Estes Express Lines', 'Saia LTL Freight', 'Canadian National Express', 'TFI International',
    'Mullen Group', 'Bison Transport', 'Day & Ross', 'Challenger Motor Freight',
];

const DRIVER_TYPES: Driver['driverType'][] = [
    'Long Haul Driver', 'Local Driver', 'Owner Operator', 'Driver Service/Lease',
];

const SATELLITE_CITIES: Record<string, string[]> = {
    TX: ['Houston, TX', 'Austin, TX', 'San Antonio, TX', 'Fort Worth, TX'],
    CA: ['Los Angeles, CA', 'San Francisco, CA', 'San Diego, CA', 'Fresno, CA'],
    FL: ['Miami, FL', 'Tampa, FL', 'Orlando, FL'],
    IL: ['Chicago, IL', 'Peoria, IL', 'Rockford, IL'],
    OR: ['Portland, OR', 'Eugene, OR', 'Salem, OR'],
    WA: ['Seattle, WA', 'Spokane, WA', 'Tacoma, WA'],
    CO: ['Denver, CO', 'Colorado Springs, CO'],
    MI: ['Detroit, MI', 'Grand Rapids, MI'],
    OH: ['Columbus, OH', 'Cleveland, OH', 'Cincinnati, OH'],
    PA: ['Philadelphia, PA', 'Pittsburgh, PA'],
    GA: ['Atlanta, GA', 'Savannah, GA', 'Macon, GA'],
    LA: ['New Orleans, LA', 'Baton Rouge, LA'],
    MA: ['Boston, MA', 'Worcester, MA'],
    ON: ['Toronto, ON', 'Ottawa, ON', 'Hamilton, ON', 'London, ON'],
    QC: ['Montreal, QC', 'Quebec City, QC', 'Laval, QC'],
    BC: ['Vancouver, BC', 'Victoria, BC', 'Surrey, BC'],
    AB: ['Calgary, AB', 'Edmonton, AB', 'Red Deer, AB'],
};

function pickSatellites(state: string, fallbackCountry: 'US' | 'CA'): string[] {
    if (SATELLITE_CITIES[state]) return SATELLITE_CITIES[state];
    return fallbackCountry === 'CA' ? ['Toronto, ON', 'Vancouver, BC'] : ['Dallas, TX', 'Chicago, IL'];
}

function zipFor(account: AccountRecord, idx: number): string {
    if (account.country === 'CA') {
        const L = (n: number) => String.fromCharCode(65 + Math.abs(n) % 26);
        return `${L(idx)}${idx % 10}${L(idx + 2)} ${idx % 10}${L(idx + 1)}${(idx * 3) % 10}`;
    }
    const seed = hash(account.id + idx);
    return pad(10000 + (seed % 89999), 5);
}

function domainFor(account: AccountRecord): string {
    return account.dbaName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
}

// ─── Driver builder ─────────────────────────────────────────────────────────

function buildDriversForCarrier(account: AccountRecord, count: number): Driver[] {
    if (count <= 0) return [];
    const rng = mulberry32(hash('drivers:' + account.id));
    const mix = mixFor(account.state);
    const poolBuckets: string[][][] = [
        [FIRST_NAMES_EN, LAST_NAMES_EN],
        [FIRST_NAMES_ES, LAST_NAMES_ES],
        [FIRST_NAMES_FR, LAST_NAMES_FR],
        [FIRST_NAMES_SA, LAST_NAMES_SA],
    ];
    const weights = [mix.en, mix.es, mix.fr, mix.sa];

    const terminalHQ = `${account.city}, ${account.state}`;
    const satellites = pickSatellites(account.state, account.country);
    const driverCountry: 'USA' | 'Canada' = account.country === 'CA' ? 'Canada' : 'USA';
    const areaCode = areaCodeFor(account.state);

    const out: Driver[] = [];
    for (let i = 0; i < count; i++) {
        const [firsts, lasts] = pickWeighted(rng, poolBuckets, weights);
        const first = pick(rng, firsts);
        const last = pick(rng, lasts);

        // Status distribution: ~90% Active, 5% On Leave, 3% Inactive, 2% Terminated
        const rStatus = rng();
        const status: Driver['status'] =
            rStatus < 0.90 ? 'Active' :
            rStatus < 0.95 ? 'On Leave' :
            rStatus < 0.98 ? 'Inactive' :
            'Terminated';

        // Hire date spread 2016..2024 (current year is 2026)
        const hireYear = 2016 + Math.floor(rng() * 9);
        const hireMonth = 1 + Math.floor(rng() * 12);
        const hireDay = 1 + Math.floor(rng() * 27);
        const hireDate = `${hireYear}-${pad(hireMonth, 2)}-${pad(hireDay, 2)}`;

        // 80% at a satellite terminal, 20% at HQ
        const terminal = rng() < 0.20 || satellites.length === 0 ? terminalHQ : pick(rng, satellites);

        // License expiry 2026..2031
        const licExpYear = 2026 + Math.floor(rng() * 6);
        const licExpMonth = 1 + Math.floor(rng() * 12);
        const licExpDay = 1 + Math.floor(rng() * 27);
        const licenseExpiry = `${licExpYear}-${pad(licExpMonth, 2)}-${pad(licExpDay, 2)}`;

        const shortId = account.id.replace('acct-', '');
        const driverId = `DRV-${shortId}-${pad(i + 1, 4)}`;
        const licClassLabel = account.country === 'CA' ? 'Class AZ' : 'CDL Class A';
        const licClass = account.country === 'CA' ? 'AZ' : 'A';
        const licenseNumber = `${last.slice(0, 3).toUpperCase()}${pad(1000 + (hash(driverId) % 90000), 5)}`;

        // Optional prior employer for drivers hired in 2018+
        const hasPriorEmployer = rng() < 0.70;
        const priorEmployer = hasPriorEmployer ? pick(rng, PRIOR_EMPLOYERS) : null;
        const priorStartYear = hireYear - 1 - Math.floor(rng() * 5);
        const priorEndYear = hireYear;

        // Travel docs: Canadian drivers always get a passport; others 20%
        const issuePassport = driverCountry === 'Canada' || rng() < 0.2;

        out.push({
            ...MOCK_DRIVER_DETAILED_TEMPLATE,
            id: driverId,
            name: `${first} ${last}`,
            firstName: first,
            lastName: last,
            avatarInitials: (first[0] + last[0]).toUpperCase(),
            status,
            phone: `(${areaCode}) ${pad(200 + i % 799, 3)}-${pad((i * 37) % 9999, 4)}`,
            email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@${domainFor(account)}`,
            hiredDate: hireDate,
            dateAdded: hireDate,
            terminal,
            carrierCode: `${account.id.slice(-3).toUpperCase()}-${pad(i + 1, 3)}`,
            driverType: DRIVER_TYPES[i % DRIVER_TYPES.length],
            dob: `${1970 + Math.floor(rng() * 35)}-${pad(1 + Math.floor(rng() * 12), 2)}-${pad(1 + Math.floor(rng() * 27), 2)}`,
            gender: rng() < 0.85 ? 'Male' : 'Female',
            ssn: `***-**-${pad((hash(driverId) % 10000), 4)}`,
            citizenship: driverCountry,
            authorizedToWork: status !== 'Terminated',
            address: `${100 + i * 3} ${pick(rng, STREET_NAMES)}`,
            city: account.city,
            state: account.state,
            zip: zipFor(account, i),
            country: driverCountry,
            emergencyContacts: [{
                name: `${pick(rng, [...FIRST_NAMES_EN, ...FIRST_NAMES_ES])} ${last}`,
                relation: pick(rng, ['Spouse', 'Parent', 'Sibling', 'Partner']),
                phone: `(${areaCode}) ${pad(300 + i % 699, 3)}-${pad((i * 59) % 9999, 4)}`,
                email: `${last.toLowerCase()}.family${i}@${domainFor(account)}`,
            }],
            previousResidences: [],
            licenseNumber,
            licenseState: account.state,
            licenseExpiry,
            licenses: [{
                id: 1,
                type: licClassLabel,
                licenseNumber,
                province: account.state,
                country: driverCountry,
                class: licClass,
                issueDate: `${licExpYear - 5}-${pad(licExpMonth, 2)}-${pad(licExpDay, 2)}`,
                expiryDate: licenseExpiry,
                status: status === 'Active' ? 'Valid' : status === 'Terminated' ? 'Revoked' : 'Valid',
                conditions: '',
                endorsements: rng() < 0.2 ? ['H (Hazmat)', 'N (Tanker)'] : rng() < 0.5 ? ['N (Tanker)'] : [],
                restrictions: [],
                isPrimary: true,
                suspended: false,
                uploadType: 'image',
            }],
            employmentHistory: priorEmployer
                ? [{
                    employerName: priorEmployer,
                    address: `Regional Terminal, ${pick(rng, satellites)}`,
                    startDate: `${priorStartYear}-01-15`,
                    endDate: `${priorEndYear}-${pad(hireMonth, 2)}-01`,
                    operatingZone: driverCountry === 'Canada' ? 'Canadian Interprovincial' : 'US Interstate',
                    terminationStatus: 'Voluntary',
                    employerContact: {
                        name: `HR Department`,
                        phone: `(${areaCode}) ${pad(400 + i % 599, 3)}-0000`,
                        email: `hr@${priorEmployer.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
                        fax: '',
                    },
                    hasReferenceDoc: false,
                }]
                : [],
            travelDocuments: issuePassport
                ? [{
                    id: `TD-${driverId}-1`,
                    type: 'Passport',
                    number: `${driverCountry === 'Canada' ? 'CA' : 'US'}${pad((hash(driverId + 'pp') % 9999999), 7)}`,
                    country: driverCountry,
                    expiryDate: `${2028 + Math.floor(rng() * 5)}-${pad(1 + Math.floor(rng() * 12), 2)}-${pad(1 + Math.floor(rng() * 27), 2)}`,
                    uploadType: 'pdf',
                }]
                : [],
            keyNumbers: [],
            documents: [],
            certificates: [],
        });
    }
    return out;
}

// ─── Eagerly build the per-carrier driver map ────────────────────────────────

export const CARRIER_DRIVERS: Record<string, Driver[]> = {};

for (const account of ACCOUNTS_DB) {
    CARRIER_DRIVERS[account.id] = buildDriversForCarrier(account, account.drivers);
}

export const getDriversForAccount = (accountId: string): Driver[] =>
    CARRIER_DRIVERS[accountId] ?? [];

export const getDriverById = (accountId: string, driverId: string): Driver | undefined =>
    CARRIER_DRIVERS[accountId]?.find(d => d.id === driverId);
