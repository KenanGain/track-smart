// Per-carrier datasets (frontend mock database)
//
// The Accounts list page passes an `accountId` to CarrierProfilePage on
// row click. `buildProfileBundle(accountId)` expands this compact per-carrier
// seed data into the shapes the profile page already consumes:
//   - viewData  (overrides INITIAL_VIEW_DATA)
//   - uiData    (overrides UI_DATA, specifically editModals.*.values)
//   - directors (overrides DIRECTOR_UI.directors)
//   - officeLocations (overrides OFFICE_LOCATIONS)
//   - drivers   (overrides MOCK_DRIVERS for that carrier)
//   - assets    (compact list; powers the fleet summary counts)
//
// For the default ACME carrier (acct-001) `buildProfileBundle` returns null
// so the profile page falls back to the original hardcoded mocks.

import { ACCOUNTS_DB, type AccountRecord } from './accounts.data';
import {
    DIRECTOR_UI,
    UI_DATA,
    INITIAL_VIEW_DATA,
    OFFICE_LOCATIONS,
    MOCK_DRIVER_DETAILED_TEMPLATE,
    type Driver,
} from '@/pages/profile/carrier-profile.data';
import { getDriversForAccount, getAssetsForAccount, getFleetCountsForAccount } from './carrier-fleet.data';

// ─── Compact seed types ──────────────────────────────────────────────────────

interface DirectorSeed {
    name: string;
    role: string;
    isPrimary: boolean;
    stockClass: string;
    ownershipPct: number;
    email: string;
    phone: string;
    since: string;
    dateAppointed: string;
}

interface OfficeSeed {
    label: string;
    address: string;
    contact: string;
    phone: string;
}

interface DriverSeed {
    firstName: string;
    lastName: string;
    status: 'Active' | 'Inactive' | 'On Leave' | 'Terminated';
    phone: string;
    email: string;
    hiredDate: string;
    terminal: string;
    driverType: 'Long Haul Driver' | 'Local Driver' | 'Owner Operator';
    licenseNumber: string;
    licenseState: string;
    licenseExpiry: string;
    city: string;
    state: string;
    zip: string;
    country: 'USA' | 'Canada';
}

interface AssetSeed {
    unitNumber: string;
    assetType: 'Truck' | 'Trailer' | 'Van';
    year: number;
    make: string;
    model: string;
    plateNumber: string;
    plateJurisdiction: string;
    status: 'Active' | 'Maintenance' | 'Deactivated';
}

interface CarrierSeed {
    identity: {
        legalName: string;
        dbaName: string;
        dotNumber: string;
        cvorNumber: string;
        nscNumber: string;
        rinNumber: string;
        businessType: 'Corporation' | 'LLC' | 'Sole Proprietor' | 'Partnership';
        stateOfInc: string;
        extraProvincial: 'Yes' | 'No';
    };
    legalAddress: {
        country: 'United States' | 'Canada';
        street: string;
        apt: string;
        city: string;
        state: string;
        zip: string;
    };
    mailingAddress: {
        streetOrPo: string;
        city: string;
        state: string;
        zip: string;
        country: 'United States' | 'Canada';
    };
    fleet: {
        powerUnits: number;
        drivers: number;
        nonCmv: number;
    };
    operations: {
        operationClassification: 'Authorized for Hire' | 'Private Carrier' | 'Exempt For Hire';
        carrierOperation: 'Interstate' | 'Intrastate Only (Hazmat)' | 'Intrastate Only (Non-Hazmat)';
        fmcsaAuthorityType: 'Motor Carrier of Property' | 'Motor Carrier of Household Goods' | 'Broker of Property';
    };
    directors: DirectorSeed[];
    offices: OfficeSeed[];
    drivers: DriverSeed[];
    assets: AssetSeed[];
}

// ─── Carrier seeds (keyed by account id) ─────────────────────────────────────
// Full coverage for acct-002..acct-030; acct-001 (ACME) falls through to the
// original INITIAL_VIEW_DATA / UI_DATA / MOCK_DRIVERS defaults.

export const CARRIER_SEEDS: Record<string, CarrierSeed> = {
    'acct-001': {
        identity: { legalName: 'Acme Trucking Inc.', dbaName: 'Acme Logistics', dotNumber: '1234567', cvorNumber: '', nscNumber: '', rinNumber: '', businessType: 'Corporation', stateOfInc: 'Delaware', extraProvincial: 'No' },
        legalAddress: { country: 'United States', street: '1200 North Dupont Hwy', apt: '', city: 'Wilmington', state: 'DE' as any, zip: '19801' },
        mailingAddress: { streetOrPo: 'PO Box 8890', city: 'Wilmington', state: 'DE' as any, zip: '19899', country: 'United States' },
        fleet: { powerUnits: 18, drivers: 22, nonCmv: 0 },
        operations: { operationClassification: 'Authorized for Hire', carrierOperation: 'Interstate', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: 'Johnathan Doe', role: 'Director of Operations', isPrimary: true, stockClass: 'Class A Common Stock', ownershipPct: 65, email: 'j.doe@acmetrucking.com', phone: '+1 (555) 123-4567', since: 'Jan 2019', dateAppointed: '2019-01-15' },
            { name: 'Sarah Smith', role: 'VP of Operations', isPrimary: false, stockClass: 'Class B Common Stock', ownershipPct: 35, email: 's.smith@acmetrucking.com', phone: '+1 (555) 987-6543', since: 'Mar 2020', dateAppointed: '2020-03-10' },
        ],
        offices: [
            { label: 'Corporate HQ - Wilmington', address: '1200 North Dupont Hwy, Wilmington, DE 19801', contact: 'Head Office', phone: '+1 (555) 123-4567' },
            { label: 'Denver Regional Office', address: '101 Broadway, Denver, CO 80203', contact: 'Regional Manager', phone: '+1 (303) 555-0199' },
        ],
        drivers: [],
        assets: [],
    },

    'acct-002': {
        identity: { legalName: 'Cascade Freight Systems LLC', dbaName: 'Cascade Freight', dotNumber: '2891034', cvorNumber: '', nscNumber: '', rinNumber: '', businessType: 'LLC', stateOfInc: 'California', extraProvincial: 'No' },
        legalAddress: { country: 'United States', street: '4200 SE Powell Blvd', apt: '', city: 'Portland', state: 'OR' as any, zip: '97206' },
        mailingAddress: { streetOrPo: 'PO Box 17290', city: 'Portland', state: 'OR' as any, zip: '97217', country: 'United States' },
        fleet: { powerUnits: 52, drivers: 86, nonCmv: 2 },
        operations: { operationClassification: 'Authorized for Hire', carrierOperation: 'Interstate', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: 'Michael Park', role: 'President / CEO', isPrimary: true, stockClass: 'Class A Common', ownershipPct: 70, email: 'm.park@cascadefreight.com', phone: '+1 (503) 555-0101', since: 'Jun 2020', dateAppointed: '2020-06-04' },
            { name: 'Ana Torres', role: 'COO', isPrimary: false, stockClass: 'Class B Common', ownershipPct: 30, email: 'a.torres@cascadefreight.com', phone: '+1 (503) 555-0102', since: 'Aug 2020', dateAppointed: '2020-08-15' },
        ],
        offices: [
            { label: 'Portland HQ', address: '4200 SE Powell Blvd, Portland, OR 97206', contact: 'Mariela Reyes', phone: '+1 (503) 555-0100' },
            { label: 'Seattle Cross-Dock', address: '1500 S Spokane St, Seattle, WA 98134', contact: 'David Lin', phone: '+1 (206) 555-0140' },
        ],
        drivers: [
            { firstName: 'Lucas', lastName: 'Nguyen', status: 'Active', phone: '(503) 555-1001', email: 'lucas.nguyen@cascadefreight.com', hiredDate: '2021-03-10', terminal: 'Portland, OR', driverType: 'Long Haul Driver', licenseNumber: 'NGU87234', licenseState: 'OR', licenseExpiry: '2027-03-09', city: 'Portland', state: 'OR', zip: '97206', country: 'USA' },
            { firstName: 'Emily', lastName: 'Ramos', status: 'Active', phone: '(503) 555-1002', email: 'emily.ramos@cascadefreight.com', hiredDate: '2022-06-22', terminal: 'Portland, OR', driverType: 'Local Driver', licenseNumber: 'RAM55189', licenseState: 'OR', licenseExpiry: '2026-08-12', city: 'Gresham', state: 'OR', zip: '97030', country: 'USA' },
            { firstName: 'James', lastName: 'Okafor', status: 'Active', phone: '(206) 555-1003', email: 'james.okafor@cascadefreight.com', hiredDate: '2020-11-04', terminal: 'Seattle, WA', driverType: 'Long Haul Driver', licenseNumber: 'OKA91120', licenseState: 'WA', licenseExpiry: '2025-11-03', city: 'Seattle', state: 'WA', zip: '98134', country: 'USA' },
            { firstName: 'Sofia', lastName: 'Martinez', status: 'On Leave', phone: '(503) 555-1004', email: 'sofia.martinez@cascadefreight.com', hiredDate: '2023-01-17', terminal: 'Portland, OR', driverType: 'Local Driver', licenseNumber: 'MAR44017', licenseState: 'OR', licenseExpiry: '2028-02-01', city: 'Beaverton', state: 'OR', zip: '97005', country: 'USA' },
        ],
        assets: [
            { unitNumber: 'CF-301', assetType: 'Truck', year: 2022, make: 'Freightliner', model: 'Cascadia', plateNumber: 'OR-CF301', plateJurisdiction: 'Oregon', status: 'Active' },
            { unitNumber: 'CF-302', assetType: 'Truck', year: 2021, make: 'Peterbilt', model: '579', plateNumber: 'OR-CF302', plateJurisdiction: 'Oregon', status: 'Active' },
            { unitNumber: 'CF-T11', assetType: 'Trailer', year: 2020, make: 'Utility', model: '3000R', plateNumber: 'OR-CFT11', plateJurisdiction: 'Oregon', status: 'Active' },
        ],
    },

    'acct-003': {
        identity: { legalName: 'Northern Lights Transport Ltd.', dbaName: 'NL Transport', dotNumber: '', cvorNumber: 'CVOR-41289', nscNumber: 'ON-11234', rinNumber: '', businessType: 'Corporation', stateOfInc: 'California', extraProvincial: 'Yes' },
        legalAddress: { country: 'Canada', street: '2500 Meadowvale Blvd', apt: '', city: 'Mississauga', state: 'ON' as any, zip: 'L5N 6C2' },
        mailingAddress: { streetOrPo: 'PO Box 5501 STN A', city: 'Mississauga', state: 'ON' as any, zip: 'L5A 4M4', country: 'Canada' },
        fleet: { powerUnits: 128, drivers: 212, nonCmv: 10 },
        operations: { operationClassification: 'Authorized for Hire', carrierOperation: 'Interstate', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: 'Margaret Chen', role: 'President / CEO', isPrimary: true, stockClass: 'Common', ownershipPct: 55, email: 'm.chen@nltransport.ca', phone: '+1 (905) 555-0201', since: 'Sep 2017', dateAppointed: '2017-09-22' },
            { name: 'Ravi Patel', role: 'Director of Safety', isPrimary: false, stockClass: 'Preferred', ownershipPct: 45, email: 'r.patel@nltransport.ca', phone: '+1 (905) 555-0202', since: 'Oct 2017', dateAppointed: '2017-10-30' },
        ],
        offices: [
            { label: 'Mississauga HQ', address: '2500 Meadowvale Blvd, Mississauga, ON L5N 6C2', contact: 'Sanjay Kumar', phone: '+1 (905) 555-0200' },
            { label: 'Montreal Terminal', address: '400 Rue Saint-Jacques, Montreal, QC H2Y 1S1', contact: 'Claire Dubois', phone: '+1 (514) 555-0221' },
        ],
        drivers: [
            { firstName: 'Tyler', lastName: 'MacDonald', status: 'Active', phone: '(905) 555-2001', email: 't.macdonald@nltransport.ca', hiredDate: '2018-04-11', terminal: 'Mississauga, ON', driverType: 'Long Haul Driver', licenseNumber: 'MAC77001', licenseState: 'ON', licenseExpiry: '2026-04-10', city: 'Mississauga', state: 'ON', zip: 'L5N 6C2', country: 'Canada' },
            { firstName: 'Priya', lastName: 'Sharma', status: 'Active', phone: '(905) 555-2002', email: 'p.sharma@nltransport.ca', hiredDate: '2019-08-05', terminal: 'Mississauga, ON', driverType: 'Long Haul Driver', licenseNumber: 'SHA48210', licenseState: 'ON', licenseExpiry: '2027-08-04', city: 'Brampton', state: 'ON', zip: 'L6P 2K2', country: 'Canada' },
            { firstName: 'Marc', lastName: 'Leblanc', status: 'Active', phone: '(514) 555-2003', email: 'm.leblanc@nltransport.ca', hiredDate: '2020-02-14', terminal: 'Montreal, QC', driverType: 'Long Haul Driver', licenseNumber: 'LEB33890', licenseState: 'QC', licenseExpiry: '2026-02-13', city: 'Laval', state: 'QC', zip: 'H7N 0A5', country: 'Canada' },
            { firstName: 'Grace', lastName: 'Okonkwo', status: 'Active', phone: '(416) 555-2004', email: 'g.okonkwo@nltransport.ca', hiredDate: '2021-09-01', terminal: 'Mississauga, ON', driverType: 'Local Driver', licenseNumber: 'OKO55412', licenseState: 'ON', licenseExpiry: '2027-09-30', city: 'Toronto', state: 'ON', zip: 'M5V 3L9', country: 'Canada' },
            { firstName: 'Jean', lastName: 'Tremblay', status: 'Terminated', phone: '(514) 555-2005', email: 'j.tremblay@nltransport.ca', hiredDate: '2017-05-20', terminal: 'Montreal, QC', driverType: 'Long Haul Driver', licenseNumber: 'TRE22107', licenseState: 'QC', licenseExpiry: '2024-05-19', city: 'Montreal', state: 'QC', zip: 'H3A 1B4', country: 'Canada' },
        ],
        assets: [
            { unitNumber: 'NL-7710', assetType: 'Truck', year: 2023, make: 'Volvo', model: 'VNL 860', plateNumber: 'ON-NL7710', plateJurisdiction: 'Ontario', status: 'Active' },
            { unitNumber: 'NL-7711', assetType: 'Truck', year: 2022, make: 'Freightliner', model: 'Cascadia', plateNumber: 'ON-NL7711', plateJurisdiction: 'Ontario', status: 'Active' },
            { unitNumber: 'NL-T42', assetType: 'Trailer', year: 2021, make: 'Great Dane', model: 'Everest', plateNumber: 'ON-NLT42', plateJurisdiction: 'Ontario', status: 'Active' },
            { unitNumber: 'NL-T43', assetType: 'Trailer', year: 2019, make: 'Wabash', model: 'DuraPlate', plateNumber: 'ON-NLT43', plateJurisdiction: 'Ontario', status: 'Maintenance' },
        ],
    },

    'acct-004': {
        identity: { legalName: 'Sunbelt Haulers Corporation', dbaName: 'Sunbelt Haulers', dotNumber: '3458721', cvorNumber: '', nscNumber: '', rinNumber: '', businessType: 'Corporation', stateOfInc: 'Texas', extraProvincial: 'No' },
        legalAddress: { country: 'United States', street: '4455 E Broadway Rd', apt: 'Suite 210', city: 'Phoenix', state: 'TX' as any, zip: '85040' },
        mailingAddress: { streetOrPo: 'PO Box 29310', city: 'Phoenix', state: 'TX' as any, zip: '85038', country: 'United States' },
        fleet: { powerUnits: 36, drivers: 64, nonCmv: 2 },
        operations: { operationClassification: 'Authorized for Hire', carrierOperation: 'Intrastate Only (Non-Hazmat)', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: 'Victor Alvarez', role: 'Founder / CEO', isPrimary: true, stockClass: 'Class A Common', ownershipPct: 80, email: 'v.alvarez@sunbelthaulers.com', phone: '+1 (602) 555-0301', since: 'Mar 2021', dateAppointed: '2021-03-18' },
            { name: 'Karen Whitlock', role: 'Director of Compliance', isPrimary: false, stockClass: 'Class B Common', ownershipPct: 20, email: 'k.whitlock@sunbelthaulers.com', phone: '+1 (602) 555-0302', since: 'May 2021', dateAppointed: '2021-05-03' },
        ],
        offices: [{ label: 'Phoenix HQ', address: '4455 E Broadway Rd Suite 210, Phoenix, TX 85040', contact: 'Hannah Greer', phone: '+1 (602) 555-0300' }],
        drivers: [
            { firstName: 'Miguel', lastName: 'Reyes', status: 'Active', phone: '(602) 555-3001', email: 'miguel.reyes@sunbelthaulers.com', hiredDate: '2022-01-12', terminal: 'Phoenix, TX', driverType: 'Local Driver', licenseNumber: 'REY66012', licenseState: 'AZ', licenseExpiry: '2026-01-11', city: 'Phoenix', state: 'AZ', zip: '85040', country: 'USA' },
            { firstName: 'Terrell', lastName: 'Jackson', status: 'Active', phone: '(602) 555-3002', email: 'terrell.jackson@sunbelthaulers.com', hiredDate: '2022-09-05', terminal: 'Phoenix, TX', driverType: 'Long Haul Driver', licenseNumber: 'JAC80221', licenseState: 'AZ', licenseExpiry: '2027-09-04', city: 'Tempe', state: 'AZ', zip: '85281', country: 'USA' },
            { firstName: 'Aisha', lastName: 'Khan', status: 'Inactive', phone: '(602) 555-3003', email: 'aisha.khan@sunbelthaulers.com', hiredDate: '2023-04-18', terminal: 'Phoenix, TX', driverType: 'Local Driver', licenseNumber: 'KHA11420', licenseState: 'AZ', licenseExpiry: '2028-04-17', city: 'Mesa', state: 'AZ', zip: '85201', country: 'USA' },
        ],
        assets: [
            { unitNumber: 'SB-101', assetType: 'Truck', year: 2021, make: 'Kenworth', model: 'T680', plateNumber: 'AZ-SB101', plateJurisdiction: 'Arizona', status: 'Active' },
            { unitNumber: 'SB-102', assetType: 'Truck', year: 2020, make: 'Mack', model: 'Anthem', plateNumber: 'AZ-SB102', plateJurisdiction: 'Arizona', status: 'Maintenance' },
        ],
    },

    'acct-005': {
        identity: { legalName: 'Great Lakes Carrier Group', dbaName: 'GLCG', dotNumber: '1120456', cvorNumber: '', nscNumber: '', rinNumber: '', businessType: 'Corporation', stateOfInc: 'Delaware', extraProvincial: 'No' },
        legalAddress: { country: 'United States', street: '8820 W Chicago Ave', apt: '', city: 'Chicago', state: 'NY' as any, zip: '60651' },
        mailingAddress: { streetOrPo: 'PO Box 1120', city: 'Chicago', state: 'NY' as any, zip: '60690', country: 'United States' },
        fleet: { powerUnits: 198, drivers: 305, nonCmv: 16 },
        operations: { operationClassification: 'Authorized for Hire', carrierOperation: 'Interstate', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: 'Evelyn Carter', role: 'Chairwoman', isPrimary: true, stockClass: 'Preferred', ownershipPct: 45, email: 'e.carter@glcg.com', phone: '+1 (312) 555-0401', since: 'Nov 2015', dateAppointed: '2015-11-02' },
            { name: 'Dimitri Volkov', role: 'CFO', isPrimary: false, stockClass: 'Common', ownershipPct: 55, email: 'd.volkov@glcg.com', phone: '+1 (312) 555-0402', since: 'Jan 2016', dateAppointed: '2016-01-05' },
        ],
        offices: [
            { label: 'Chicago HQ', address: '8820 W Chicago Ave, Chicago, IL 60651', contact: 'Pamela Bright', phone: '+1 (312) 555-0400' },
            { label: 'Detroit Regional', address: '3100 W Grand Blvd, Detroit, MI 48202', contact: 'Roberto Hall', phone: '+1 (313) 555-0440' },
            { label: 'Cleveland Hub', address: '1500 Euclid Ave, Cleveland, OH 44115', contact: 'Janet Quinn', phone: '+1 (216) 555-0470' },
        ],
        drivers: [
            { firstName: 'Derek', lastName: 'Holloway', status: 'Active', phone: '(312) 555-4001', email: 'derek.holloway@glcg.com', hiredDate: '2016-03-21', terminal: 'Chicago, IL', driverType: 'Long Haul Driver', licenseNumber: 'HOL90112', licenseState: 'IL', licenseExpiry: '2026-03-20', city: 'Chicago', state: 'IL', zip: '60651', country: 'USA' },
            { firstName: 'Tanya', lastName: 'Williams', status: 'Active', phone: '(312) 555-4002', email: 'tanya.williams@glcg.com', hiredDate: '2017-07-14', terminal: 'Chicago, IL', driverType: 'Long Haul Driver', licenseNumber: 'WIL23884', licenseState: 'IL', licenseExpiry: '2027-07-13', city: 'Oak Park', state: 'IL', zip: '60301', country: 'USA' },
            { firstName: 'Rafael', lastName: 'Diaz', status: 'Active', phone: '(313) 555-4003', email: 'rafael.diaz@glcg.com', hiredDate: '2018-05-02', terminal: 'Detroit, MI', driverType: 'Long Haul Driver', licenseNumber: 'DIA46721', licenseState: 'MI', licenseExpiry: '2026-05-01', city: 'Detroit', state: 'MI', zip: '48202', country: 'USA' },
            { firstName: 'Morgan', lastName: 'Lee', status: 'On Leave', phone: '(216) 555-4004', email: 'morgan.lee@glcg.com', hiredDate: '2019-10-09', terminal: 'Cleveland, OH', driverType: 'Local Driver', licenseNumber: 'LEE81203', licenseState: 'OH', licenseExpiry: '2028-10-08', city: 'Cleveland', state: 'OH', zip: '44115', country: 'USA' },
            { firstName: 'Sven', lastName: 'Anderson', status: 'Active', phone: '(312) 555-4005', email: 'sven.anderson@glcg.com', hiredDate: '2020-12-11', terminal: 'Chicago, IL', driverType: 'Owner Operator', licenseNumber: 'AND00918', licenseState: 'IL', licenseExpiry: '2026-12-10', city: 'Chicago', state: 'IL', zip: '60614', country: 'USA' },
        ],
        assets: [
            { unitNumber: 'GL-1001', assetType: 'Truck', year: 2023, make: 'Freightliner', model: 'Cascadia', plateNumber: 'IL-GL1001', plateJurisdiction: 'Illinois', status: 'Active' },
            { unitNumber: 'GL-1002', assetType: 'Truck', year: 2022, make: 'Volvo', model: 'VNL 760', plateNumber: 'IL-GL1002', plateJurisdiction: 'Illinois', status: 'Active' },
            { unitNumber: 'GL-1003', assetType: 'Truck', year: 2021, make: 'Peterbilt', model: '579', plateNumber: 'IL-GL1003', plateJurisdiction: 'Illinois', status: 'Active' },
            { unitNumber: 'GL-T210', assetType: 'Trailer', year: 2020, make: 'Utility', model: '4000D-X', plateNumber: 'IL-GLT210', plateJurisdiction: 'Illinois', status: 'Active' },
        ],
    },

    'acct-006': {
        identity: { legalName: 'Evergreen Logistics Inc.', dbaName: 'Evergreen', dotNumber: '4482190', cvorNumber: '', nscNumber: '', rinNumber: '', businessType: 'Corporation', stateOfInc: 'Delaware', extraProvincial: 'No' },
        legalAddress: { country: 'United States', street: '2201 Alaskan Way', apt: '', city: 'Seattle', state: 'CA' as any, zip: '98121' },
        mailingAddress: { streetOrPo: 'PO Box 22101', city: 'Seattle', state: 'CA' as any, zip: '98111', country: 'United States' },
        fleet: { powerUnits: 10, drivers: 22, nonCmv: 2 },
        operations: { operationClassification: 'Private Carrier', carrierOperation: 'Intrastate Only (Non-Hazmat)', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: 'Natalie Brooks', role: 'Founder / CEO', isPrimary: true, stockClass: 'Class A Common', ownershipPct: 100, email: 'n.brooks@evergreenlog.com', phone: '+1 (206) 555-0501', since: 'Aug 2024', dateAppointed: '2024-08-29' },
        ],
        offices: [{ label: 'Seattle HQ', address: '2201 Alaskan Way, Seattle, WA 98121', contact: 'Natalie Brooks', phone: '+1 (206) 555-0500' }],
        drivers: [
            { firstName: 'Owen', lastName: 'Clark', status: 'Active', phone: '(206) 555-5001', email: 'owen.clark@evergreenlog.com', hiredDate: '2024-09-03', terminal: 'Seattle, WA', driverType: 'Local Driver', licenseNumber: 'CLA66329', licenseState: 'WA', licenseExpiry: '2028-09-02', city: 'Seattle', state: 'WA', zip: '98121', country: 'USA' },
            { firstName: 'Harper', lastName: 'Vance', status: 'Active', phone: '(206) 555-5002', email: 'harper.vance@evergreenlog.com', hiredDate: '2024-10-15', terminal: 'Seattle, WA', driverType: 'Local Driver', licenseNumber: 'VAN74521', licenseState: 'WA', licenseExpiry: '2028-10-14', city: 'Bellevue', state: 'WA', zip: '98004', country: 'USA' },
        ],
        assets: [{ unitNumber: 'EG-22', assetType: 'Van', year: 2024, make: 'Mercedes', model: 'Sprinter', plateNumber: 'WA-EG22', plateJurisdiction: 'Washington', status: 'Active' }],
    },

    'acct-007': {
        identity: { legalName: 'Maple Ridge Transport Co.', dbaName: 'Maple Ridge', dotNumber: '', cvorNumber: '', nscNumber: 'AB-55410', rinNumber: '', businessType: 'Corporation', stateOfInc: 'California', extraProvincial: 'Yes' },
        legalAddress: { country: 'Canada', street: '5040 16 Ave SE', apt: '', city: 'Calgary', state: 'NY' as any, zip: 'T2A 0J8' },
        mailingAddress: { streetOrPo: 'PO Box 5050 STN M', city: 'Calgary', state: 'NY' as any, zip: 'T2P 4L8', country: 'Canada' },
        fleet: { powerUnits: 68, drivers: 97, nonCmv: 3 },
        operations: { operationClassification: 'Authorized for Hire', carrierOperation: 'Interstate', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: 'Ethan Mackenzie', role: 'CEO', isPrimary: true, stockClass: 'Common', ownershipPct: 60, email: 'e.mackenzie@mapleridgetransport.ca', phone: '+1 (403) 555-0701', since: 'Feb 2018', dateAppointed: '2018-02-14' },
            { name: 'Isla Gagnon', role: 'VP Operations', isPrimary: false, stockClass: 'Common', ownershipPct: 40, email: 'i.gagnon@mapleridgetransport.ca', phone: '+1 (403) 555-0702', since: 'Apr 2018', dateAppointed: '2018-04-02' },
        ],
        offices: [{ label: 'Calgary HQ', address: '5040 16 Ave SE, Calgary, AB T2A 0J8', contact: 'Jordan Walsh', phone: '+1 (403) 555-0700' }],
        drivers: [
            { firstName: 'Liam', lastName: 'Fraser', status: 'Active', phone: '(403) 555-7001', email: 'liam.fraser@mapleridgetransport.ca', hiredDate: '2018-06-10', terminal: 'Calgary, AB', driverType: 'Long Haul Driver', licenseNumber: 'FRA21043', licenseState: 'AB', licenseExpiry: '2026-06-09', city: 'Calgary', state: 'AB', zip: 'T2A 0J8', country: 'Canada' },
            { firstName: 'Olivia', lastName: 'Brock', status: 'Active', phone: '(403) 555-7002', email: 'olivia.brock@mapleridgetransport.ca', hiredDate: '2019-11-22', terminal: 'Calgary, AB', driverType: 'Local Driver', licenseNumber: 'BRO33120', licenseState: 'AB', licenseExpiry: '2027-11-21', city: 'Airdrie', state: 'AB', zip: 'T4B 0B4', country: 'Canada' },
            { firstName: 'Noah', lastName: 'Cardinal', status: 'Active', phone: '(403) 555-7003', email: 'noah.cardinal@mapleridgetransport.ca', hiredDate: '2020-07-08', terminal: 'Calgary, AB', driverType: 'Long Haul Driver', licenseNumber: 'CAR88102', licenseState: 'AB', licenseExpiry: '2026-07-07', city: 'Calgary', state: 'AB', zip: 'T2P 4L8', country: 'Canada' },
        ],
        assets: [
            { unitNumber: 'MR-404', assetType: 'Truck', year: 2022, make: 'Peterbilt', model: '389', plateNumber: 'AB-MR404', plateJurisdiction: 'Alberta', status: 'Active' },
            { unitNumber: 'MR-405', assetType: 'Truck', year: 2021, make: 'Freightliner', model: 'Cascadia', plateNumber: 'AB-MR405', plateJurisdiction: 'Alberta', status: 'Active' },
        ],
    },

    'acct-008': {
        identity: { legalName: 'Lone Star Freightways LLC', dbaName: 'Lone Star', dotNumber: '3019887', cvorNumber: '', nscNumber: '', rinNumber: '', businessType: 'LLC', stateOfInc: 'Texas', extraProvincial: 'No' },
        legalAddress: { country: 'United States', street: '6600 Stemmons Fwy', apt: '', city: 'Dallas', state: 'TX' as any, zip: '75247' },
        mailingAddress: { streetOrPo: 'PO Box 660022', city: 'Dallas', state: 'TX' as any, zip: '75266', country: 'United States' },
        fleet: { powerUnits: 112, drivers: 178, nonCmv: 5 },
        operations: { operationClassification: 'Authorized for Hire', carrierOperation: 'Interstate', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: 'Buck Matthews', role: 'Managing Member', isPrimary: true, stockClass: 'Member Units A', ownershipPct: 65, email: 'b.matthews@lonestarfw.com', phone: '+1 (214) 555-0801', since: 'May 2016', dateAppointed: '2016-05-30' },
            { name: 'Renee Harper', role: 'Director of Safety', isPrimary: false, stockClass: 'Member Units B', ownershipPct: 35, email: 'r.harper@lonestarfw.com', phone: '+1 (214) 555-0802', since: 'Jul 2016', dateAppointed: '2016-07-11' },
        ],
        offices: [
            { label: 'Dallas HQ', address: '6600 Stemmons Fwy, Dallas, TX 75247', contact: 'Pete Gonzalez', phone: '+1 (214) 555-0800' },
            { label: 'Houston Hub', address: '4501 Irvington Blvd, Houston, TX 77009', contact: 'Beverly McCoy', phone: '+1 (713) 555-0830' },
        ],
        drivers: [
            { firstName: 'Wyatt', lastName: 'Cruz', status: 'Active', phone: '(214) 555-8001', email: 'wyatt.cruz@lonestarfw.com', hiredDate: '2017-09-10', terminal: 'Dallas, TX', driverType: 'Long Haul Driver', licenseNumber: 'CRU77201', licenseState: 'TX', licenseExpiry: '2027-09-09', city: 'Dallas', state: 'TX', zip: '75247', country: 'USA' },
            { firstName: 'Bella', lastName: 'Hart', status: 'Active', phone: '(214) 555-8002', email: 'bella.hart@lonestarfw.com', hiredDate: '2018-02-05', terminal: 'Dallas, TX', driverType: 'Long Haul Driver', licenseNumber: 'HAR12930', licenseState: 'TX', licenseExpiry: '2026-02-04', city: 'Arlington', state: 'TX', zip: '76010', country: 'USA' },
            { firstName: 'Jose', lastName: 'Mendez', status: 'Active', phone: '(713) 555-8003', email: 'jose.mendez@lonestarfw.com', hiredDate: '2019-06-18', terminal: 'Houston, TX', driverType: 'Long Haul Driver', licenseNumber: 'MEN40521', licenseState: 'TX', licenseExpiry: '2026-06-17', city: 'Houston', state: 'TX', zip: '77009', country: 'USA' },
            { firstName: 'Kayla', lastName: 'Rowe', status: 'Inactive', phone: '(214) 555-8004', email: 'kayla.rowe@lonestarfw.com', hiredDate: '2021-04-22', terminal: 'Dallas, TX', driverType: 'Local Driver', licenseNumber: 'ROW55810', licenseState: 'TX', licenseExpiry: '2027-04-21', city: 'Plano', state: 'TX', zip: '75023', country: 'USA' },
        ],
        assets: [
            { unitNumber: 'LS-880', assetType: 'Truck', year: 2022, make: 'Kenworth', model: 'T680', plateNumber: 'TX-LS880', plateJurisdiction: 'Texas', status: 'Active' },
            { unitNumber: 'LS-881', assetType: 'Truck', year: 2022, make: 'Kenworth', model: 'T680', plateNumber: 'TX-LS881', plateJurisdiction: 'Texas', status: 'Active' },
            { unitNumber: 'LS-T50', assetType: 'Trailer', year: 2021, make: 'Great Dane', model: 'Champion', plateNumber: 'TX-LST50', plateJurisdiction: 'Texas', status: 'Active' },
        ],
    },

    'acct-009': {
        identity: { legalName: 'Rocky Mountain Hauling Inc.', dbaName: 'Rocky Mtn Haul', dotNumber: '2774553', cvorNumber: '', nscNumber: '', rinNumber: '', businessType: 'Corporation', stateOfInc: 'Delaware', extraProvincial: 'No' },
        legalAddress: { country: 'United States', street: '17500 E 40th Ave', apt: '', city: 'Denver', state: 'NY' as any, zip: '80011' },
        mailingAddress: { streetOrPo: 'PO Box 17500', city: 'Denver', state: 'NY' as any, zip: '80217', country: 'United States' },
        fleet: { powerUnits: 4, drivers: 0, nonCmv: 1 },
        operations: { operationClassification: 'Authorized for Hire', carrierOperation: 'Interstate', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: 'George Wheeler', role: 'CEO (inactive)', isPrimary: true, stockClass: 'Common', ownershipPct: 100, email: 'g.wheeler@rmhauling.com', phone: '+1 (303) 555-0901', since: 'Jul 2019', dateAppointed: '2019-07-11' },
        ],
        offices: [{ label: 'Denver HQ', address: '17500 E 40th Ave, Denver, CO 80011', contact: 'George Wheeler', phone: '+1 (303) 555-0900' }],
        drivers: [],
        assets: [
            { unitNumber: 'RM-01', assetType: 'Truck', year: 2018, make: 'International', model: 'LT625', plateNumber: 'CO-RM01', plateJurisdiction: 'Colorado', status: 'Deactivated' },
        ],
    },

    'acct-010': {
        identity: { legalName: 'Atlantic Coastal Transport LLC', dbaName: 'ACT', dotNumber: '1998732', cvorNumber: '', nscNumber: '', rinNumber: '', businessType: 'LLC', stateOfInc: 'Florida', extraProvincial: 'No' },
        legalAddress: { country: 'United States', street: '5400 Phillips Hwy', apt: '', city: 'Jacksonville', state: 'TX' as any, zip: '32207' },
        mailingAddress: { streetOrPo: 'PO Box 54000', city: 'Jacksonville', state: 'TX' as any, zip: '32247', country: 'United States' },
        fleet: { powerUnits: 84, drivers: 134, nonCmv: 3 },
        operations: { operationClassification: 'Authorized for Hire', carrierOperation: 'Interstate', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: 'Catalina Ruiz', role: 'Managing Member', isPrimary: true, stockClass: 'Member Units A', ownershipPct: 55, email: 'c.ruiz@actllc.com', phone: '+1 (904) 555-1001', since: 'Oct 2018', dateAppointed: '2018-10-05' },
            { name: 'Wesley Grant', role: 'CFO', isPrimary: false, stockClass: 'Member Units B', ownershipPct: 45, email: 'w.grant@actllc.com', phone: '+1 (904) 555-1002', since: 'Nov 2018', dateAppointed: '2018-11-12' },
        ],
        offices: [{ label: 'Jacksonville HQ', address: '5400 Phillips Hwy, Jacksonville, FL 32207', contact: 'Melissa Tate', phone: '+1 (904) 555-1000' }],
        drivers: [
            { firstName: 'Damon', lastName: 'Rivers', status: 'Active', phone: '(904) 555-0101', email: 'damon.rivers@actllc.com', hiredDate: '2019-01-14', terminal: 'Jacksonville, FL', driverType: 'Long Haul Driver', licenseNumber: 'RIV22710', licenseState: 'FL', licenseExpiry: '2027-01-13', city: 'Jacksonville', state: 'FL', zip: '32207', country: 'USA' },
            { firstName: 'Jasmine', lastName: 'Bell', status: 'Active', phone: '(904) 555-0102', email: 'jasmine.bell@actllc.com', hiredDate: '2020-08-25', terminal: 'Jacksonville, FL', driverType: 'Local Driver', licenseNumber: 'BEL44182', licenseState: 'FL', licenseExpiry: '2026-08-24', city: 'Jacksonville Beach', state: 'FL', zip: '32250', country: 'USA' },
            { firstName: 'Cesar', lastName: 'Navarro', status: 'Active', phone: '(904) 555-0103', email: 'cesar.navarro@actllc.com', hiredDate: '2021-05-17', terminal: 'Jacksonville, FL', driverType: 'Long Haul Driver', licenseNumber: 'NAV66031', licenseState: 'FL', licenseExpiry: '2027-05-16', city: 'Orange Park', state: 'FL', zip: '32065', country: 'USA' },
        ],
        assets: [
            { unitNumber: 'ACT-601', assetType: 'Truck', year: 2022, make: 'Freightliner', model: 'Cascadia', plateNumber: 'FL-ACT601', plateJurisdiction: 'Florida', status: 'Active' },
            { unitNumber: 'ACT-602', assetType: 'Truck', year: 2021, make: 'Mack', model: 'Pinnacle', plateNumber: 'FL-ACT602', plateJurisdiction: 'Florida', status: 'Active' },
        ],
    },

    // Compact entries for remaining carriers — identity + 2 directors + 1 office + 2 drivers + 2 assets each.
    'acct-011': genericSeed('Prairie Express Carriers', 'Prairie Express', '', 'NSC-MB-29011', 'Winnipeg', 'MB' as any, 'Canada', 27, 41, 'Owen Kowalski', 'Lindsay Trent', '+1 (204) 555-1101', '204'),
    'acct-012': genericSeed('Heartland Trucking Partners', 'Heartland', '2554109', '', 'Kansas City', 'MO' as any, 'United States', 44, 58, 'Paul Sinclair', 'Denise Holbrook', '+1 (816) 555-1201', '816'),
    'acct-013': genericSeed('Bay Area Logistics Inc.', 'BAL', '3887221', '', 'Oakland', 'CA' as any, 'United States', 145, 201, 'Lena Ishikawa', 'Marcus Chen', '+1 (510) 555-1301', '510'),
    'acct-014': genericSeed('Summit Peak Transport Corp.', 'Summit Peak', '4221078', '', 'Salt Lake City', 'UT' as any, 'United States', 52, 73, 'Colton Briggs', 'Amelia Doyle', '+1 (801) 555-1401', '801'),
    'acct-015': genericSeed('St. Lawrence Cartage Ltd.', 'St. Lawrence', '', 'NSC-QC-77819', 'Montreal', 'QC' as any, 'Canada', 88, 119, 'Phillipe Gagnon', 'Celine Bouchard', '+1 (514) 555-1501', '514'),
    'acct-016': genericSeed('Blue Ridge Freight Services', 'Blue Ridge', '1665328', '', 'Charlotte', 'NC' as any, 'United States', 68, 92, 'Heath Calloway', 'Renata Simmons', '+1 (704) 555-1601', '704'),
    'acct-017': genericSeed('Desert Wind Transport LLC', 'Desert Wind', '3101877', '', 'Albuquerque', 'NM' as any, 'United States', 30, 45, 'Ramon Silva', 'Gloria Ortega', '+1 (505) 555-1701', '505'),
    'acct-018': genericSeed('Pacific Crown Logistics Inc.', 'Pacific Crown', '', 'NSC-BC-44210', 'Vancouver', 'BC' as any, 'Canada', 102, 156, 'Declan Moore', 'Iris Woo', '+1 (604) 555-1801', '604'),
    'acct-019': genericSeed('Liberty Bell Carriers Corp.', 'Liberty Bell', '2998012', '', 'Philadelphia', 'PA' as any, 'United States', 77, 110, 'Francis OConnell', 'Yvonne Chase', '+1 (215) 555-1901', '215'),
    'acct-020': genericSeed('Midwest Anchor Trucking', 'Midwest Anchor', '2330917', '', 'Indianapolis', 'IN' as any, 'United States', 61, 88, 'Dwight Foster', 'Monica Brand', '+1 (317) 555-2001', '317'),
    'acct-021': genericSeed('Greenfield Transport Solutions', 'Greenfield', '4487621', '', 'Columbus', 'OH' as any, 'United States', 8, 12, 'Savannah Knight', 'Todd Parrish', '+1 (614) 555-2101', '614'),
    'acct-022': genericSeed('Silver Creek Hauling Inc.', 'Silver Creek', '2110445', '', 'Boise', 'ID' as any, 'United States', 24, 36, 'Quincy Blake', 'Paige Hamlin', '+1 (208) 555-2201', '208'),
    'acct-023': genericSeed('Gateway Carriers LLC', 'Gateway', '1899332', '', 'St. Louis', 'MO' as any, 'United States', 94, 127, 'Byron Fletcher', 'Rhonda Meadows', '+1 (314) 555-2301', '314'),
    'acct-024': genericSeed('Harborline Transport Co.', 'Harborline', '3377004', '', 'Boston', 'MA' as any, 'United States', 49, 74, 'Rory Finnegan', 'Alyssa Lowell', '+1 (617) 555-2401', '617'),
    'acct-025': genericSeed('Thunder Bay Freight Ltd.', 'Thunder Bay Freight', '', 'NSC-ON-33087', 'Thunder Bay', 'ON' as any, 'Canada', 6, 0, 'Vincent Hawke', 'Susan Marlowe', '+1 (807) 555-2501', '807'),
    'acct-026': genericSeed('Iron Horse Logistics LLC', 'Iron Horse', '2668210', '', 'Omaha', 'NE' as any, 'United States', 37, 52, 'Hugo Lambert', 'Theresa Wyatt', '+1 (402) 555-2601', '402'),
    'acct-027': genericSeed('Coastal Edge Trucking Corp.', 'Coastal Edge', '3229914', '', 'Savannah', 'GA' as any, 'United States', 67, 98, 'Orlando Pierce', 'Whitney Lang', '+1 (912) 555-2701', '912'),
    'acct-028': genericSeed('Crescent City Cartage', 'Crescent City', '2881077', '', 'New Orleans', 'LA' as any, 'United States', 42, 61, 'Beau Thibodeaux', 'Evangeline Roux', '+1 (504) 555-2801', '504'),
    'acct-029': genericSeed('Polar Star Transport Inc.', 'Polar Star', '', 'NSC-AB-66190', 'Edmonton', 'AB' as any, 'Canada', 96, 143, 'Sterling Howe', 'Natasha Vasilieva', '+1 (780) 555-2901', '780'),
    'acct-030': genericSeed('Redwood Freight Partners', 'Redwood', '3998021', '', 'Sacramento', 'CA' as any, 'United States', 80, 115, 'Mason Kerr', 'Juliana Ortega', '+1 (916) 555-3001', '916'),
};

// ─── Generic seed factory for carriers where the individual flavor is less
// important. Keeps the dataset file readable without 30× repetition.
const FIRST_NAMES = ['Alex','Jordan','Sam','Casey','Taylor','Morgan','Jamie','Riley','Quinn','Avery','Cameron','Drew','Parker','Reese','Skyler','Emerson','Hayden','Logan','Peyton','Rowan','Sage','Blake','Jesse','Kai','Micah','Noel','Phoenix','River','Shay','Tatum','Blair','Harley','Lane','Marley','Oakley'];
const LAST_NAMES = ['Morgan','Rivera','Patel','Nguyen','Brooks','Hughes','Sanchez','Wright','Cooper','Reed','Bailey','Murphy','Foster','Howard','Ward','Watson','Powell','Long','Cole','Perry','Butler','Simmons','Henderson','Coleman','Jenkins','Price','Webb','Ross','Stone','Harrison','Morrison','Burke','Cross','Dean','Fisher'];

function seededPick<T>(arr: T[], n: number, offset: number): T {
    return arr[(n + offset) % arr.length];
}

// Reusable driver seed generator (shared by genericSeed + buildProfileBundle padding).
export function generateDriverSeeds(
    count: number,
    context: {
        city: string;
        state: string;
        country: 'USA' | 'Canada';
        zip: string;
        areaCode: string;
        legalName: string;
        domain: string;
        startIndex?: number;
    }
): DriverSeed[] {
    const out: DriverSeed[] = [];
    const start = context.startIndex ?? 0;
    for (let k = 0; k < count; k++) {
        const i = start + k;
        const first = seededPick(FIRST_NAMES, i, context.legalName.length);
        const last = seededPick(LAST_NAMES, i * 3 + 1, context.areaCode.length);
        const types: DriverSeed['driverType'][] = ['Long Haul Driver', 'Local Driver', 'Owner Operator'];
        const status: DriverSeed['status'] =
            i % 17 === 0 ? 'On Leave' :
            i % 23 === 0 ? 'Inactive' :
            'Active';
        out.push({
            firstName: first,
            lastName: last,
            status,
            phone: `(${context.areaCode}) 555-${String(1000 + i).slice(-4)}`,
            email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@${context.domain}`,
            hiredDate: `${2018 + (i % 7)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`,
            terminal: `${context.city}, ${context.state}`,
            driverType: types[i % types.length],
            licenseNumber: `${last.slice(0, 3).toUpperCase()}${context.areaCode}${String(10 + i).slice(-4)}`,
            licenseState: context.state,
            licenseExpiry: `${2026 + (i % 4)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`,
            city: context.city,
            state: context.state,
            zip: context.zip,
            country: context.country,
        });
    }
    return out;
}

// Reusable asset seed generator, split into trucks / trailers / vans by ratio.
export function generateAssetSeeds(
    count: number,
    context: { state: string; prefix: string; startIndex?: number }
): AssetSeed[] {
    if (count <= 0) return [];
    const start = context.startIndex ?? 0;
    const trucks = Math.max(0, Math.round(count * 0.65));
    const trailers = Math.max(0, Math.round(count * 0.30));
    const vans = Math.max(0, count - trucks - trailers);
    const truckMakes = [['Freightliner','Cascadia'],['Kenworth','T680'],['Peterbilt','579'],['Volvo','VNL 760'],['Mack','Anthem'],['International','LT625']];
    const trailerMakes = [['Utility','3000R'],['Great Dane','Everest'],['Wabash','DuraPlate'],['Hyundai','Translead']];
    const vanMakes = [['Ford','Transit'],['Mercedes','Sprinter'],['Ram','ProMaster']];
    const out: AssetSeed[] = [];
    for (let i = 0; i < trucks; i++) {
        const [mk, mdl] = truckMakes[i % truckMakes.length];
        out.push({ unitNumber: `${context.prefix}-T${String(100 + start + i).padStart(3, '0')}`, assetType: 'Truck', year: 2018 + ((i + start) % 7), make: mk, model: mdl, plateNumber: `${context.state}-${context.prefix}T${start + i + 1}`, plateJurisdiction: context.state, status: (i % 11 === 0 ? 'Maintenance' : 'Active') });
    }
    for (let i = 0; i < trailers; i++) {
        const [mk, mdl] = trailerMakes[i % trailerMakes.length];
        out.push({ unitNumber: `${context.prefix}-TR${String(100 + start + i).padStart(3, '0')}`, assetType: 'Trailer', year: 2017 + ((i + 2) % 7), make: mk, model: mdl, plateNumber: `${context.state}-${context.prefix}TR${start + i + 1}`, plateJurisdiction: context.state, status: 'Active' });
    }
    for (let i = 0; i < vans; i++) {
        const [mk, mdl] = vanMakes[i % vanMakes.length];
        out.push({ unitNumber: `${context.prefix}-V${String(10 + start + i).padStart(2, '0')}`, assetType: 'Van', year: 2019 + ((i + 1) % 6), make: mk, model: mdl, plateNumber: `${context.state}-${context.prefix}V${start + i + 1}`, plateJurisdiction: context.state, status: 'Active' });
    }
    return out;
}

function genericSeed(
    legalName: string,
    dbaName: string,
    dotNumber: string,
    nscNumber: string,
    city: string,
    state: string,
    country: 'United States' | 'Canada',
    assetsCount: number,
    driversCount: number,
    primaryDirector: string,
    secondaryDirector: string,
    phone: string,
    areaCode: string,
): CarrierSeed {
    const domain = dbaName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    const cvorNumber = state === 'ON' ? `CVOR-${areaCode}${legalName.length}0` : '';
    const zipUS = `${(parseInt(areaCode) * 100 + 1) % 99999}`.padStart(5, '0');
    const zip = country === 'Canada' ? 'A1A 1A1' : zipUS;

    // Driver / asset arrays now live in carrier-fleet.data.ts. Keep these
    // empty on the seed so CarrierSeed only holds identity / directors /
    // offices / operations. `trucks` / `vans` are kept for the fleet stub
    // below but the authoritative counts come from getFleetCountsForAccount().
    const drivers: DriverSeed[] = [];
    const assets: AssetSeed[] = [];
    const trucks = Math.max(1, Math.round(assetsCount * 0.60));
    const vans = Math.max(0, assetsCount - trucks - Math.round(assetsCount * 0.35));

    return {
        identity: {
            legalName,
            dbaName,
            dotNumber,
            cvorNumber,
            nscNumber,
            rinNumber: '',
            businessType: legalName.includes('LLC') ? 'LLC' : legalName.includes('Ltd') ? 'Corporation' : 'Corporation',
            stateOfInc: country === 'Canada' ? 'California' : 'Delaware',
            extraProvincial: country === 'Canada' ? 'Yes' : 'No',
        },
        legalAddress: { country, street: `${100 + legalName.length * 7} Main St`, apt: '', city, state, zip },
        mailingAddress: { streetOrPo: `PO Box ${1000 + legalName.length}`, city, state, zip, country },
        fleet: { powerUnits: trucks, drivers: driversCount, nonCmv: vans },
        operations: { operationClassification: 'Authorized for Hire', carrierOperation: 'Interstate', fmcsaAuthorityType: 'Motor Carrier of Property' },
        directors: [
            { name: primaryDirector, role: 'President / CEO', isPrimary: true, stockClass: 'Class A Common', ownershipPct: 60, email: `${primaryDirector.split(' ')[0].toLowerCase()}@${domain}`, phone, since: '2018', dateAppointed: '2018-01-01' },
            { name: secondaryDirector, role: 'VP Operations', isPrimary: false, stockClass: 'Class B Common', ownershipPct: 40, email: `${secondaryDirector.split(' ')[0].toLowerCase()}@${domain}`, phone: phone.slice(0, -1) + '2', since: '2019', dateAppointed: '2019-01-01' },
        ],
        offices: [{ label: `${city} HQ`, address: `100 Main St, ${city}, ${state}`, contact: primaryDirector, phone }],
        drivers,
        assets,
    };
}

// ─── Per-carrier cargo (commodities hauled) ──────────────────────────────────
// Keyed by account id. Values match UI_DATA.cargoEditor friendly labels.
// Carriers without an entry fall back to DEFAULT_CARGO.

const DEFAULT_CARGO = ['General Freight', 'Household Goods', 'Paper Products'];

export const CARRIER_CARGO: Record<string, string[]> = {
    'acct-001': ['General Freight', 'Household Goods', 'Building Materials', 'Fresh Produce', 'Refrigerated Food', 'Beverages'], // Acme — mixed
    'acct-002': ['General Freight', 'Fresh Produce', 'Beverages', 'Paper Products'], // Cascade — Pacific NW freight + produce
    'acct-003': ['General Freight', 'Auto Parts', 'Household Goods', 'Electronics', 'Building Materials'], // Northern Lights — mixed Canadian
    'acct-004': ['Building Materials', 'Construction', 'Machinery, Large Objects'], // Sunbelt — desert construction
    'acct-005': ['General Freight', 'Steel', 'Machinery, Large Objects', 'Auto Parts', 'Paper Products', 'Metal: sheets, coils, rolls'], // Great Lakes — industrial midwest
    'acct-006': ['General Freight', 'Grocery Items'], // Evergreen — small/new
    'acct-007': ['Logs, Poles, Beams, Lumber', 'Building Materials', 'Grain, Feed, Hay'], // Maple Ridge — Alberta lumber/ag
    'acct-008': ['General Freight', 'Oilfield Equipment', 'Liquids, Gases', 'Chemicals'], // Lone Star — Texas oilfield
    'acct-009': ['General Freight'], // Rocky Mountain — inactive
    'acct-010': ['Refrigerated Food', 'Fresh Produce', 'Beverages', 'Sea Food'], // Atlantic Coastal — FL reefer
    'acct-011': ['Grain, Feed, Hay', 'Farm Supplies', 'Livestock'], // Prairie Express — grain belt
    'acct-012': ['General Freight', 'Grocery Items', 'Meat'], // Heartland
    'acct-013': ['Electronics', 'General Freight', 'Intermodal Containers'], // Bay Area — tech/port
    'acct-014': ['Building Materials', 'Chemicals', 'Machinery, Large Objects'], // Summit Peak
    'acct-015': ['General Freight', 'Paper Products', 'Beverages'], // St. Lawrence
    'acct-016': ['Furniture', 'Household Goods', 'Appliances', 'General Freight'], // Blue Ridge — NC furniture
    'acct-017': ['Chemicals', 'Liquids, Gases', 'Building Materials'], // Desert Wind
    'acct-018': ['Intermodal Containers', 'General Freight', 'Logs, Poles, Beams, Lumber'], // Pacific Crown
    'acct-019': ['Pharmaceutical Products', 'General Freight', 'Paper Products'], // Liberty Bell — Philly pharma
    'acct-020': ['Auto Parts', 'General Freight', 'Appliances'], // Midwest Anchor
    'acct-021': ['General Freight'], // Greenfield — new
    'acct-022': ['Grain, Feed, Hay', 'Logs, Poles, Beams, Lumber'], // Silver Creek — Idaho
    'acct-023': ['General Freight', 'Beverages', 'Paper Products'], // Gateway
    'acct-024': ['Sea Food', 'Refrigerated Food', 'General Freight'], // Harborline
    'acct-025': ['Logs, Poles, Beams, Lumber'], // Thunder Bay — inactive
    'acct-026': ['Grain, Feed, Hay', 'General Freight', 'Livestock'], // Iron Horse
    'acct-027': ['Paper Products', 'Intermodal Containers', 'General Freight'], // Coastal Edge — Savannah port
    'acct-028': ['Sea Food', 'Chemicals', 'Refrigerated Food'], // Crescent City
    'acct-029': ['Oilfield Equipment', 'Chemicals', 'Liquids, Gases'], // Polar Star
    'acct-030': ['Fresh Produce', 'Beverages', 'General Freight'], // Redwood
};

// ─── Builders that expand seeds to the exact shapes the profile expects ──────

export function buildDriverFromSeed(accountId: string, idx: number, seed: DriverSeed): Driver {
    const shortId = accountId.replace('acct-', '');
    const id = `DRV-${shortId}-${String(idx + 1).padStart(3, '0')}`;
    const name = `${seed.firstName} ${seed.lastName}`;
    const initials = (seed.firstName[0] || '') + (seed.lastName[0] || '');
    return {
        ...MOCK_DRIVER_DETAILED_TEMPLATE,
        id,
        name,
        firstName: seed.firstName,
        lastName: seed.lastName,
        status: seed.status,
        avatarInitials: initials.toUpperCase(),
        phone: seed.phone,
        email: seed.email,
        hiredDate: seed.hiredDate,
        dateAdded: seed.hiredDate,
        terminal: seed.terminal,
        carrierCode: `${accountId.toUpperCase()}`,
        driverType: seed.driverType,
        dob: '1985-01-01',
        gender: 'Not specified',
        ssn: '***-**-****',
        citizenship: seed.country === 'Canada' ? 'Canada' : 'USA',
        authorizedToWork: seed.status === 'Active',
        address: `${100 + idx * 3} Main St`,
        city: seed.city,
        state: seed.state,
        zip: seed.zip,
        country: seed.country,
        licenseNumber: seed.licenseNumber,
        licenseState: seed.licenseState,
        licenseExpiry: seed.licenseExpiry,
        emergencyContacts: [],
        previousResidences: [],
        licenses: [{
            id: 1,
            type: seed.country === 'Canada' ? 'Class AZ' : 'CDL Class A',
            licenseNumber: seed.licenseNumber,
            province: seed.licenseState,
            country: seed.country,
            class: seed.country === 'Canada' ? 'AZ' : 'A',
            issueDate: `${parseInt(seed.licenseExpiry) - 5}-01-01`,
            expiryDate: seed.licenseExpiry,
            status: seed.status === 'Active' ? 'Valid' : 'Suspended',
            conditions: '',
            endorsements: [],
            restrictions: [],
            isPrimary: true,
            suspended: false,
            uploadType: 'image',
        }],
        employmentHistory: [],
        travelDocuments: [],
        keyNumbers: [],
        documents: [],
        certificates: [],
    };
}

export interface CarrierProfileBundle {
    viewData: typeof INITIAL_VIEW_DATA;
    uiData: typeof UI_DATA;
    directors: typeof DIRECTOR_UI.directors;
    officeLocations: typeof OFFICE_LOCATIONS;
    drivers: Driver[];
    assets: import('@/pages/assets/assets.data').Asset[];
    assetSummary: { total: number; active: number; maintenance: number; deactivated: number };
}

export function buildProfileBundle(accountId: string | undefined | null): CarrierProfileBundle | null {
    if (!accountId) return null;
    const account = ACCOUNTS_DB.find(a => a.id === accountId) as AccountRecord | undefined;
    const seed = CARRIER_SEEDS[accountId];
    if (!account || !seed) return null;

    // viewData override — only the parts the page actually reads.
    const viewData: typeof INITIAL_VIEW_DATA = JSON.parse(JSON.stringify(INITIAL_VIEW_DATA));
    viewData.page.carrierHeader.name = seed.identity.legalName;
    viewData.page.carrierHeader.meta = [
        { label: 'DOT:', badge: { text: seed.identity.dotNumber ? 'Active' : 'N/A', tone: seed.identity.dotNumber ? 'success' : 'muted' } },
        { label: 'CVOR/RIN/NSC:', badge: { text: (seed.identity.cvorNumber || seed.identity.nscNumber || seed.identity.rinNumber) ? 'Valid' : 'N/A', tone: 'success' } },
        { label: 'Location:', text: `${account.city}, ${account.state}` },
    ];
    viewData.page.cards.directorsOfficers.rows = seed.directors.map(d => ({
        name: d.name,
        title: d.role,
        ownershipPct: d.ownershipPct,
        actionLabel: 'View More',
    }));

    // Fleet counts are derived from the refined fleet database
    // (carrier-fleet.data.ts), which owns all drivers and assets for this
    // carrier with region-aware naming, proper VINs, plates, etc.
    const fleetCounts = getFleetCountsForAccount(accountId);
    const derivedPowerUnits = fleetCounts.powerUnits;
    const derivedNonCmv = fleetCounts.nonCmv;
    const derivedDrivers = fleetCounts.drivers;

    // uiData override — patch the .values blocks that feed the visible fields.
    const uiData: typeof UI_DATA = JSON.parse(JSON.stringify(UI_DATA));
    (uiData.editModals.corporateIdentity.values as any) = { ...seed.identity };
    (uiData.editModals.legalMainAddress.values as any) = { ...seed.legalAddress };
    (uiData.editModals.mailingAddress.values as any) = { ...seed.mailingAddress };
    (uiData.editModals.fleetDriverOverview.values as any) = {
        powerUnits: derivedPowerUnits,
        drivers: derivedDrivers,
        nonCmv: derivedNonCmv,
    };
    (uiData.editModals.operationsAuthority.values as any) = { ...seed.operations };
    (uiData.cargoEditor.values as any) = { selected: [...(CARRIER_CARGO[accountId] ?? DEFAULT_CARGO)] };

    // Directors dictionary keyed by name
    const directors: typeof DIRECTOR_UI.directors = {} as any;
    seed.directors.forEach(d => {
        (directors as any)[d.name] = {
            name: d.name,
            role: d.role,
            initials: d.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(),
            since: d.since,
            isPrimary: d.isPrimary,
            stockClass: d.stockClass,
            ownershipPct: d.ownershipPct,
            email: d.email,
            phone: d.phone,
            office: seed.offices[0]?.address ?? '',
            dateAppointed: d.dateAppointed,
            dateResigned: '',
            responsibility: d.role,
        };
    });

    // Office locations
    const officeLocations = seed.offices.map((o, i) => ({
        id: `LOC-${accountId}-${i + 1}`,
        label: o.label,
        address: o.address,
        contact: o.contact,
        phone: o.phone,
        operatingHours: [
            { day: 'Mon - Fri', hours: '08:00 - 18:00' },
            { day: 'Sat', hours: '10:00 - 14:00' },
            { day: 'Sun', hours: 'Closed' },
        ],
    }));

    // Drivers come directly from the refined fleet database
    const drivers = getDriversForAccount(accountId);

    // Asset summary derived from the same database (operationalStatus-aware)
    const carrierAssets = getAssetsForAccount(accountId);
    const assetSummary = {
        total: carrierAssets.length,
        active: carrierAssets.filter(a => a.operationalStatus === 'Active').length,
        maintenance: carrierAssets.filter(a => a.operationalStatus === 'Maintenance').length,
        deactivated: carrierAssets.filter(a => a.operationalStatus === 'Deactivated').length,
    };

    return { viewData, uiData, directors, officeLocations, drivers, assets: carrierAssets, assetSummary };
}
