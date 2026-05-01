// CVOR Intervention & Event Details
// Source: CVOR PDF (SR-LV-029A) - "Intervention and Event Details" section
// Each row is one event: an inspection, collision, or conviction.

export type CvorEventType = 'inspection' | 'collision' | 'conviction';

export type VehicleRef = {
  make: string;
  unit: string;
  plate: string;
  jurisdiction: string; // e.g. CAON, CAQC, NB
};

export type InspectionDefect = {
  category: string;
  defect: string;
  oos?: boolean;
};

export type CollisionExtras = {
  collisionClass: string;     // e.g. CLASS-INJURY, CLASS-PROPERTY DAMAGE ONLY
  jurisdiction: string;       // CAON
  vehicleAction: string;      // VEH ACTN-CHANGING LANES
  vehicleCondition: string;   // VEH COND-NO APPARENT DEFECT
  driverAction: string;       // DR ACT-IMPROPER LANE CHANGE
  driverCondition: string;    // DR COND-NORMAL
  driverCharged: 'Y' | 'N';
  points: number;
  microfilm: string;
};

export type ConvictionExtras = {
  convictionDate: string;     // 2026-01-12
  jurisdiction: string;       // CAON or QC
  chargedCarrier: 'Y' | 'N' | '-';
  driverName?: string;
  driverLicenceJurisdiction?: string;
  driverLicence?: string;
  offenceLocation?: string;
  microfilm: string;
  offence: string;
  ccmtaEquivalency?: string;
  points: number;
};

export type CvorInterventionEvent = {
  id: string;
  type: CvorEventType;
  date: string;          // YYYY-MM-DD
  startTime?: string;    // HH:MM (inspections)
  endTime?: string;      // HH:MM (inspections)
  time?: string;         // HH:MM (collision / conviction event time)
  cvir?: string;         // inspection CVIR #
  ticket?: string;       // collision / conviction ticket #
  location?: string;
  driverName?: string;
  driverLicence?: string;
  driverLicenceJurisdiction?: string; // CAON, NB, ON, etc.
  vehicle1?: VehicleRef;
  vehicle2?: VehicleRef;
  level?: number;             // inspection level
  numVehicles?: number;
  vehiclePoints?: number;     // for inspections
  driverPoints?: number;      // for inspections
  pointsTotal?: number;       // for collisions / convictions
  oosCount?: number;          // categories OOS* count for inspections
  totalDefects?: number;      // total all defects for inspections
  charged?: 'Y' | 'N';        // inspection charged Y/N
  coDriver?: 'Y' | 'N';
  impoundment?: 'Y' | 'N';
  defects?: InspectionDefect[];
  collision?: CollisionExtras;
  conviction?: ConvictionExtras;
};

export const CVOR_INTERVENTION_PERIOD = {
  fromDate: '2025-07-25',
  toDate: '2026-02-25',
};

// Travel Kilometric Information (CVOR PDF "Travel Kilometric Information" table)
// Each row is one reporting period; type = 'Estimated' | 'Actual'.
export type CvorTravelKmRow = {
  fromDate: string;
  toDate: string;
  vehicles: number;
  doubleShifted: number;
  totalVehicles: number;
  ontarioKm: number;
  restOfCanadaKm: number;
  usMexicoKm: number;
  drivers: number;
  totalKm: number;
  type: 'Estimated' | 'Actual';
};

export const cvorTravelKm: CvorTravelKmRow[] = [
  { fromDate: '2025-04-01', toDate: '2026-03-31', vehicles: 132, doubleShifted: 0,  totalVehicles: 132, ontarioKm: 11448642, restOfCanadaKm: 4566908, usMexicoKm: 0, drivers: 158, totalKm: 16015550, type: 'Estimated' },
  { fromDate: '2024-05-07', toDate: '2025-03-31', vehicles: 132, doubleShifted: 0,  totalVehicles: 132, ontarioKm: 10494588, restOfCanadaKm: 4186332, usMexicoKm: 0, drivers: 158, totalKm: 14680920, type: 'Actual' },
  { fromDate: '2023-05-07', toDate: '2024-05-06', vehicles: 130, doubleShifted: 0,  totalVehicles: 130, ontarioKm: 12587452, restOfCanadaKm: 3157891, usMexicoKm: 0, drivers: 153, totalKm: 15745343, type: 'Actual' },
  { fromDate: '2023-04-01', toDate: '2024-03-31', vehicles: 135, doubleShifted: 0,  totalVehicles: 135, ontarioKm: 12407962, restOfCanadaKm: 3372498, usMexicoKm: 0, drivers: 155, totalKm: 15780460, type: 'Estimated' },
  { fromDate: '2022-05-07', toDate: '2023-03-31', vehicles: 135, doubleShifted: 0,  totalVehicles: 135, ontarioKm: 11373965, restOfCanadaKm: 3091456, usMexicoKm: 0, drivers: 155, totalKm: 14465421, type: 'Actual' },
  { fromDate: '2021-05-07', toDate: '2022-05-06', vehicles: 130, doubleShifted: 0,  totalVehicles: 130, ontarioKm: 16388058, restOfCanadaKm: 666469,  usMexicoKm: 0, drivers: 150, totalKm: 17054527, type: 'Actual' },
  { fromDate: '2021-04-01', toDate: '2022-03-31', vehicles: 130, doubleShifted: 0,  totalVehicles: 130, ontarioKm: 16343160, restOfCanadaKm: 664644,  usMexicoKm: 0, drivers: 150, totalKm: 17007804, type: 'Estimated' },
  { fromDate: '2020-05-07', toDate: '2021-03-31', vehicles: 130, doubleShifted: 0,  totalVehicles: 130, ontarioKm: 14981233, restOfCanadaKm: 6131262, usMexicoKm: 0, drivers: 150, totalKm: 21112495, type: 'Actual' },
  { fromDate: '2019-05-07', toDate: '2020-05-06', vehicles: 121, doubleShifted: 0,  totalVehicles: 121, ontarioKm: 14459891, restOfCanadaKm: 6093788, usMexicoKm: 0, drivers: 140, totalKm: 20553679, type: 'Actual' },
  { fromDate: '2019-04-01', toDate: '2020-03-31', vehicles: 120, doubleShifted: 15, totalVehicles: 120, ontarioKm: 14000000, restOfCanadaKm: 6000000, usMexicoKm: 0, drivers: 135, totalKm: 20000000, type: 'Estimated' },
  { fromDate: '2018-05-06', toDate: '2019-03-31', vehicles: 103, doubleShifted: 12, totalVehicles: 103, ontarioKm: 9987913,  restOfCanadaKm: 5899712, usMexicoKm: 0, drivers: 115, totalKm: 15887625, type: 'Actual' },
  { fromDate: '2017-05-06', toDate: '2018-05-05', vehicles: 97,  doubleShifted: 8,  totalVehicles: 97,  ontarioKm: 9591395,  restOfCanadaKm: 3799251, usMexicoKm: 0, drivers: 105, totalKm: 13390646, type: 'Actual' },
  { fromDate: '2017-04-01', toDate: '2018-04-01', vehicles: 115, doubleShifted: 10, totalVehicles: 115, ontarioKm: 13500000, restOfCanadaKm: 5000000, usMexicoKm: 0, drivers: 125, totalKm: 18500000, type: 'Estimated' },
  { fromDate: '2016-04-01', toDate: '2017-04-01', vehicles: 110, doubleShifted: 10, totalVehicles: 110, ontarioKm: 13000000, restOfCanadaKm: 3200000, usMexicoKm: 0, drivers: 125, totalKm: 16200000, type: 'Estimated' },
  { fromDate: '2016-04-01', toDate: '2017-03-31', vehicles: 108, doubleShifted: 8,  totalVehicles: 108, ontarioKm: 13069855, restOfCanadaKm: 4189676, usMexicoKm: 0, drivers: 116, totalKm: 17259531, type: 'Actual' },
  { fromDate: '2015-04-01', toDate: '2016-03-31', vehicles: 100, doubleShifted: 10, totalVehicles: 100, ontarioKm: 11906046, restOfCanadaKm: 2975754, usMexicoKm: 0, drivers: 115, totalKm: 14881800, type: 'Actual' },
  { fromDate: '2015-04-01', toDate: '2016-03-31', vehicles: 75,  doubleShifted: 4,  totalVehicles: 75,  ontarioKm: 8954000,  restOfCanadaKm: 2080000, usMexicoKm: 0, drivers: 79,  totalKm: 11034000, type: 'Estimated' },
  { fromDate: '2014-04-01', toDate: '2015-03-31', vehicles: 72,  doubleShifted: 4,  totalVehicles: 72,  ontarioKm: 8140503,  restOfCanadaKm: 1891413, usMexicoKm: 0, drivers: 76,  totalKm: 10031916, type: 'Actual' },
  { fromDate: '2014-04-01', toDate: '2015-03-31', vehicles: 68,  doubleShifted: 5,  totalVehicles: 68,  ontarioKm: 6671621,  restOfCanadaKm: 2255127, usMexicoKm: 0, drivers: 71,  totalKm: 8926748,  type: 'Estimated' },
  { fromDate: '2013-04-01', toDate: '2014-03-31', vehicles: 65,  doubleShifted: 5,  totalVehicles: 65,  ontarioKm: 6353925,  restOfCanadaKm: 2147740, usMexicoKm: 0, drivers: 68,  totalKm: 8501665,  type: 'Actual' },
  { fromDate: '2013-04-01', toDate: '2014-03-31', vehicles: 65,  doubleShifted: 11, totalVehicles: 65,  ontarioKm: 4378006,  restOfCanadaKm: 130011,  usMexicoKm: 0, drivers: 72,  totalKm: 4508017,  type: 'Estimated' },
  { fromDate: '2012-07-01', toDate: '2013-03-31', vehicles: 60,  doubleShifted: 9,  totalVehicles: 60,  ontarioKm: 3980006,  restOfCanadaKm: 118192,  usMexicoKm: 0, drivers: 68,  totalKm: 4098198,  type: 'Actual' },
  { fromDate: '2012-07-01', toDate: '2013-03-31', vehicles: 58,  doubleShifted: 8,  totalVehicles: 58,  ontarioKm: 2690049,  restOfCanadaKm: 1224226, usMexicoKm: 0, drivers: 82,  totalKm: 3914275,  type: 'Estimated' },
  { fromDate: '2012-01-01', toDate: '2012-06-30', vehicles: 56,  doubleShifted: 8,  totalVehicles: 56,  ontarioKm: 1627605,  restOfCanadaKm: 740715,  usMexicoKm: 0, drivers: 77,  totalKm: 2368320,  type: 'Actual' },
  { fromDate: '2012-01-01', toDate: '2012-06-30', vehicles: 59,  doubleShifted: 6,  totalVehicles: 59,  ontarioKm: 1759868,  restOfCanadaKm: 694736,  usMexicoKm: 0, drivers: 67,  totalKm: 2454604,  type: 'Estimated' },
  { fromDate: '2011-04-01', toDate: '2011-12-31', vehicles: 55,  doubleShifted: 6,  totalVehicles: 55,  ontarioKm: 2769369,  restOfCanadaKm: 819369,  usMexicoKm: 0, drivers: 64,  totalKm: 3588738,  type: 'Actual' },
  { fromDate: '2011-04-01', toDate: '2011-12-31', vehicles: 54,  doubleShifted: 4,  totalVehicles: 54,  ontarioKm: 1273937,  restOfCanadaKm: 824307,  usMexicoKm: 0, drivers: 57,  totalKm: 2098244,  type: 'Estimated' },
  { fromDate: '2010-04-01', toDate: '2011-03-31', vehicles: 51,  doubleShifted: 4,  totalVehicles: 51,  ontarioKm: 1506951,  restOfCanadaKm: 896227,  usMexicoKm: 0, drivers: 57,  totalKm: 2403178,  type: 'Actual' },
  { fromDate: '2010-04-01', toDate: '2011-03-31', vehicles: 50,  doubleShifted: 4,  totalVehicles: 50,  ontarioKm: 3200000,  restOfCanadaKm: 400000,  usMexicoKm: 0, drivers: 0,   totalKm: 3600000,  type: 'Estimated' },
  { fromDate: '2009-04-01', toDate: '2010-03-31', vehicles: 45,  doubleShifted: 4,  totalVehicles: 45,  ontarioKm: 3400000,  restOfCanadaKm: 400000,  usMexicoKm: 0, drivers: 0,   totalKm: 3800000,  type: 'Actual' },
  { fromDate: '2009-04-01', toDate: '2010-03-31', vehicles: 45,  doubleShifted: 2,  totalVehicles: 45,  ontarioKm: 2700000,  restOfCanadaKm: 625000,  usMexicoKm: 0, drivers: 47,  totalKm: 3325000,  type: 'Estimated' },
  { fromDate: '2008-04-01', toDate: '2009-03-31', vehicles: 43,  doubleShifted: 2,  totalVehicles: 43,  ontarioKm: 2665622,  restOfCanadaKm: 618372,  usMexicoKm: 0, drivers: 45,  totalKm: 3283994,  type: 'Actual' },
  { fromDate: '2008-04-01', toDate: '2009-03-31', vehicles: 0,   doubleShifted: 0,  totalVehicles: 0,   ontarioKm: 12000,    restOfCanadaKm: 0,       usMexicoKm: 0, drivers: 0,   totalKm: 12000,    type: 'Estimated' },
  { fromDate: '2007-04-01', toDate: '2008-03-31', vehicles: 41,  doubleShifted: 2,  totalVehicles: 41,  ontarioKm: 2188802,  restOfCanadaKm: 367244,  usMexicoKm: 0, drivers: 43,  totalKm: 2556046,  type: 'Actual' },
  { fromDate: '2007-04-01', toDate: '2008-03-31', vehicles: 28,  doubleShifted: 3,  totalVehicles: 28,  ontarioKm: 1822160,  restOfCanadaKm: 79613,   usMexicoKm: 0, drivers: 36,  totalKm: 1901773,  type: 'Estimated' },
  { fromDate: '2006-04-01', toDate: '2007-03-31', vehicles: 26,  doubleShifted: 3,  totalVehicles: 26,  ontarioKm: 1709850,  restOfCanadaKm: 72550,   usMexicoKm: 0, drivers: 36,  totalKm: 1782400,  type: 'Actual' },
  { fromDate: '2005-04-01', toDate: '2006-03-31', vehicles: 19,  doubleShifted: 3,  totalVehicles: 19,  ontarioKm: 1000000,  restOfCanadaKm: 60000,   usMexicoKm: 0, drivers: 32,  totalKm: 1060000,  type: 'Actual' },
];

export const cvorInterventionEvents: CvorInterventionEvent[] = [
  {
    id: 'INSP-ONEA01827393', type: 'inspection', date: '2026-01-13',
    startTime: '19:20', endTime: '19:48', cvir: 'ONEA01827393',
    location: 'Gananoque South TIS',
    driverName: 'DULAY, JASWANT SINGH', driverLicence: 'D92003908640312', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: 'DS291', plate: 'PB15983', jurisdiction: 'CAON' },
    vehicle2: { make: 'VANG', unit: '390127', plate: 'Z2851C', jurisdiction: 'CAON' },
    level: 2, numVehicles: 2, vehiclePoints: 0, driverPoints: 0,
    oosCount: 0, totalDefects: 0, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [],
  },
  {
    id: 'COLL-061422178', type: 'collision', date: '2026-01-06', time: '13:16',
    location: 'HALTON HILLS, 401',
    driverName: 'SIDHU, GURCHARAN SINGH', driverLicence: 'S41323088841018', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: '', unit: '', plate: 'PB34467', jurisdiction: 'CAON' },
    pointsTotal: 4,
    collision: {
      collisionClass: 'CLASS-INJURY', jurisdiction: 'CAON',
      vehicleAction: 'VEH ACTN-CHANGING LANES', vehicleCondition: 'VEH COND-NO APPARENT DEFECT',
      driverAction: 'DR ACT-IMPROPER LANE CHANGE', driverCondition: 'DR COND-NORMAL',
      driverCharged: 'N', points: 4, microfilm: '061422178',
    },
  },
  {
    id: 'INSP-ONEA01822167', type: 'inspection', date: '2025-12-17',
    startTime: '09:48', endTime: '10:10', cvir: 'ONEA01822167',
    location: 'Peel District',
    driverName: 'SUKHDEEP SINGH', driverLicence: 'S91870000941107', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: 'DS303', plate: 'PA90324', jurisdiction: 'CAON' },
    vehicle2: { make: 'MAX', unit: 'DSTZ1037', plate: 'T2382A', jurisdiction: 'CAON' },
    level: 2, numVehicles: 2, vehiclePoints: 0, driverPoints: 0,
    oosCount: 0, totalDefects: 0, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [],
  },
  {
    id: 'INSP-465114', type: 'inspection', date: '2025-12-04',
    startTime: '10:57', endTime: '11:34', cvir: '465114',
    location: 'EDMUNDSTON',
    driverName: 'LOVEPREET SINGH', driverLicence: 'L6854-00009-80818', driverLicenceJurisdiction: 'ON',
    vehicle1: { make: 'VOLV', unit: '', plate: 'PA78619', jurisdiction: 'NB' },
    vehicle2: { make: '', unit: '', plate: 'RP9471C', jurisdiction: 'NB' },
    level: 3, numVehicles: 2, vehiclePoints: 0, driverPoints: 0,
    oosCount: 0, totalDefects: 0, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [],
  },
  {
    id: 'CONV-251020091500', type: 'conviction', date: '2025-12-04', time: '20:01',
    ticket: '251020091500',
    vehicle1: { make: '', unit: '', plate: 'BR35771', jurisdiction: 'CAON' },
    pointsTotal: 5,
    conviction: {
      convictionDate: '2026-01-12', jurisdiction: 'CAON', chargedCarrier: '-',
      offenceLocation: '@ON1020 DERRY RD. AND TOMKEN RD',
      microfilm: '065779406', offence: 'LT-OWNR FAIL STOP',
      points: 5,
    },
  },
  {
    id: 'INSP-ONEA01817989', type: 'inspection', date: '2025-12-01',
    startTime: '11:44', endTime: '12:13', cvir: 'ONEA01817989',
    location: 'Gananoque South TIS',
    driverName: 'VERMA, GURDEEP', driverLicence: 'V27123080980608', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: '289', plate: 'PB12617', jurisdiction: 'CAON' },
    vehicle2: { make: 'WABA', unit: '104', plate: 'X7383F', jurisdiction: 'CAON' },
    level: 2, numVehicles: 2, vehiclePoints: 0, driverPoints: 0,
    oosCount: 0, totalDefects: 0, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [],
  },
  {
    id: 'CONV-1004006133568072', type: 'conviction', date: '2025-11-20', time: '05:00',
    vehicle1: { make: '', unit: '', plate: 'P6105P', jurisdiction: 'ON' },
    pointsTotal: 3,
    conviction: {
      convictionDate: '2026-01-09', jurisdiction: 'QC', chargedCarrier: '-',
      microfilm: '1004006133568072', offence: 'SPEEDING PHOTO RADAR',
      ccmtaEquivalency: 'Speeding 11-20 km/hour over posted limit',
      points: 3,
    },
  },
  {
    id: 'INSP-ONEA01812825', type: 'inspection', date: '2025-11-14',
    startTime: '00:30', endTime: '02:03', cvir: 'ONEA01812825',
    location: 'Gananoque South TIS',
    driverName: 'LOVEPREET SINGH', driverLicence: 'L68540000980818', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: 'DS273', plate: 'PA78575', jurisdiction: 'CAON' },
    vehicle2: { make: 'STOU', unit: 'DST3229', plate: '25869V', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 1, driverPoints: 0,
    oosCount: 1, totalDefects: 1, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'COUPLING DEVICES', defect: 'UPPR COUPLR-UPPR PLT CRCK/REPWLD', oos: true },
    ],
  },
  {
    id: 'INSP-ONEA01813056', type: 'inspection', date: '2025-11-14',
    startTime: '12:00', endTime: '13:26', cvir: 'ONEA01813056',
    location: 'Vineland TIS',
    driverName: 'SINGH, GAGANDEEP', driverLicence: 'S44902710860823', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: 'DS269', plate: 'PA68547', jurisdiction: 'CAON' },
    vehicle2: { make: 'MAXA', unit: 'CNRZ1920', plate: 'N83332', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 1, driverPoints: 1,
    oosCount: 2, totalDefects: 2, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'COUPLING DEVICES', defect: 'LWR COUPLR-MOUNT FAST MISS/INEFF', oos: true },
      { category: 'DRIVERS LICENCES', defect: 'D/L- NO ENDORSE/CON RESTRICTION',  oos: true },
    ],
  },
  {
    id: 'CONV-1004006133506288', type: 'conviction', date: '2025-11-13', time: '05:00',
    vehicle1: { make: '', unit: '', plate: 'N1422C', jurisdiction: 'ON' },
    pointsTotal: 3,
    conviction: {
      convictionDate: '2026-01-09', jurisdiction: 'QC', chargedCarrier: '-',
      microfilm: '1004006133506288', offence: 'SPEEDING PHOTO RADAR',
      ccmtaEquivalency: 'Speeding 11-20 km/hour over posted limit',
      points: 3,
    },
  },
  {
    id: 'INSP-ONEA01812566', type: 'inspection', date: '2025-11-13',
    startTime: '12:20', endTime: '12:47', cvir: 'ONEA01812566',
    location: 'Peel District',
    driverName: 'HARPREET SINGH', driverLicence: 'H06550000951104', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: 'DS293', plate: 'CB38115', jurisdiction: 'CAON' },
    level: 2, numVehicles: 1, vehiclePoints: 0, driverPoints: 0,
    oosCount: 0, totalDefects: 0, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [],
  },
  {
    id: 'INSP-ONEA01811636', type: 'inspection', date: '2025-11-11',
    startTime: '14:40', endTime: '15:18', cvir: 'ONEA01811636',
    location: 'Gananoque South TIS',
    driverName: 'DILPREET SINGH', driverLicence: 'D43910000021020', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'FRHT', unit: 'DS265', plate: 'PA59318', jurisdiction: 'CAON' },
    vehicle2: { make: 'MANA', unit: 'DST3200', plate: 'X2289R', jurisdiction: 'CAON' },
    level: 2, numVehicles: 2, vehiclePoints: 0, driverPoints: 0,
    oosCount: 0, totalDefects: 4, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'HOURS OF SERVICE', defect: 'DAILY-FL TK 10 HRS OFF-DTY A DAY' },
      { category: 'HOURS OF SERVICE', defect: 'DAILY-DRIVE > 13 HOURS IN A DAY' },
      { category: 'HOURS OF SERVICE', defect: 'MISS/INC INFO PKT' },
      { category: 'CVOR/NSC',         defect: 'CVOR/NSC - NO VALID CERTIFICATE' },
    ],
  },
  {
    id: 'INSP-ONEA01810928', type: 'inspection', date: '2025-11-08',
    startTime: '11:17', endTime: '13:58', cvir: 'ONEA01810928',
    location: 'Gananoque South TIS',
    driverName: 'HARPREET SINGH', driverLicence: 'H06550000951104', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: 'DS293', plate: 'CB38115', jurisdiction: 'CAON' },
    vehicle2: { make: 'UTIL', unit: '', plate: 'N8056C', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 2, driverPoints: 0,
    oosCount: 3, totalDefects: 7, charged: 'Y', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'BRAKE SYSTEM',     defect: 'BRAKES-BRAKE INOPERATIVE',         oos: true },
      { category: 'TRIP INSPECTION',  defect: 'TRIP INSPECTION - IMPROPER' },
      { category: 'BRAKE SYSTEM',     defect: 'BRAKES-COMBINATION OF 20%DEFECTS', oos: true },
      { category: 'BRAKE SYSTEM',     defect: 'BRAKES-COMPONENTS EXTERNAL',       oos: true },
      { category: 'BRAKE SYSTEM',     defect: 'BRAKES-ADJUSTMENT' },
      { category: 'BRAKE SYSTEM',     defect: 'BRAKES-BRAKE INOPERATIVE' },
      { category: 'BRAKE SYSTEM',     defect: 'BRAKES' },
    ],
  },
  {
    id: 'INSP-ONEA01809841', type: 'inspection', date: '2025-11-05',
    startTime: '11:01', endTime: '11:59', cvir: 'ONEA01809841',
    location: 'Bowmanville TIS',
    driverName: 'BAL, RAJWINDER SINGH', driverLicence: 'B02306388901213', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'INTL', unit: 'DS295', plate: 'PB24086', jurisdiction: 'CAON' },
    vehicle2: { make: 'DIMO', unit: '4142', plate: 'TUW292', jurisdiction: 'CAON' },
    level: 2, numVehicles: 2, vehiclePoints: 0, driverPoints: 0,
    oosCount: 0, totalDefects: 1, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'OFFICER DIRECTION', defect: 'OFFICER DIRECTION - FAIL TO STOP' },
    ],
  },
  {
    id: 'INSP-ONEA01809549', type: 'inspection', date: '2025-11-04',
    startTime: '14:24', endTime: '15:15', cvir: 'ONEA01809549',
    location: 'Lancaster TIS',
    driverName: 'SINGH, SUKHJINDER', driverLicence: 'S520820026807', driverLicenceJurisdiction: 'CAPQ',
    vehicle1: { make: 'VOLV', unit: 'DS264', plate: 'PA59317', jurisdiction: 'CAON' },
    vehicle2: { make: 'UTIL', unit: 'DST124', plate: 'R2678E', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 3, driverPoints: 0,
    oosCount: 3, totalDefects: 5, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'BRAKE SYSTEM',    defect: 'AIR SUPPLY-LINES LEAKING',           oos: true },
      { category: 'WHEELS/RIMS',     defect: 'WHEELS/RIMS - DISC WHL - CRK/DMG',    oos: true },
      { category: 'BRAKE SYSTEM',    defect: 'AIR SUPPLY-AIR LOSS RATE',            oos: true },
      { category: 'TRIP INSPECTION', defect: 'TRIP INSPECTION - IMPROPER' },
      { category: 'HOURS OF SERVICE', defect: 'ELECTRONIC LOGGING DEVICES' },
    ],
  },
  {
    id: 'INSP-ONEA01808884', type: 'inspection', date: '2025-11-02',
    startTime: '17:37', endTime: '18:55', cvir: 'ONEA01808884',
    location: 'Gananoque South TIS',
    driverName: 'HARDIP SINGH', driverLicence: 'H05690000840921', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'FRHT', unit: 'DS279', plate: 'PA86824', jurisdiction: 'CAON' },
    vehicle2: { make: 'MANA', unit: 'DST3204', plate: 'X2291R', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 1, driverPoints: 0,
    oosCount: 1, totalDefects: 6, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'BRAKE SYSTEM',     defect: 'DRUMS/ROTORS-CRACKED',     oos: true },
      { category: 'TRIP INSPECTION',  defect: 'TRIP INSPECTION - IMPROPER' },
      { category: 'REGISTRATION',     defect: 'REGISTRATION' },
      { category: 'BRAKE SYSTEM',     defect: 'BRAKES' },
      { category: 'BRAKE SYSTEM',     defect: 'BRAKES-BRAKE INOPERATIVE' },
      { category: 'BRAKE SYSTEM',     defect: 'BRAKES-ADJUSTMENT' },
    ],
  },
  {
    id: 'INSP-ONEA01806008', type: 'inspection', date: '2025-10-23',
    startTime: '06:38', endTime: '07:42', cvir: 'ONEA01806008',
    location: 'Putnam North TIS',
    driverName: 'HARPAL SINGH', driverLicence: 'H06530000980521', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: 'DS299', plate: 'PB24197', jurisdiction: 'CAON' },
    vehicle2: { make: 'ITD', unit: 'CNRZ1932', plate: 'R5118W', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 1, driverPoints: 0,
    oosCount: 1, totalDefects: 5, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'BRAKE SYSTEM',    defect: 'BRAKES-ADJUSTMENT',         oos: true },
      { category: 'TRIP INSPECTION', defect: 'TRIP INSPECTION - IMPROPER' },
      { category: 'BRAKE SYSTEM',    defect: 'BRAKES' },
    ],
  },
  {
    id: 'INSP-ONEA01801369', type: 'inspection', date: '2025-10-08',
    startTime: '21:35', endTime: '21:51', cvir: 'ONEA01801369',
    location: 'Kingston District',
    driverName: 'SAHOTA, BALWINDER SINGH', driverLicence: 'S01720728661106', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'FRHT', unit: 'DS138', plate: '9034PZ', jurisdiction: 'CAON' },
    vehicle2: { make: 'WABA', unit: 'DST116', plate: 'P3476X', jurisdiction: 'CAON' },
    level: 3, numVehicles: 2, vehiclePoints: 0, driverPoints: 0,
    oosCount: 0, totalDefects: 0, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [],
  },
  {
    id: 'INSP-ONEA01798651', type: 'inspection', date: '2025-10-01',
    startTime: '10:19', endTime: '11:56', cvir: 'ONEA01798651',
    location: 'Gananoque South TIS',
    driverName: 'SUMAL, JAGTAR SINGH', driverLicence: 'S92373830821214', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: 'DS268', plate: 'PB24084', jurisdiction: 'CAON' },
    vehicle2: { make: 'MANA', unit: 'DST3217', plate: 'Z9499A', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 0, driverPoints: 0,
    oosCount: 0, totalDefects: 4, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'TRIP INSPECTION', defect: 'TRIP INSPECTION - IMPROPER' },
      { category: 'BRAKE SYSTEM',    defect: 'BRAKES' },
      { category: 'BRAKE SYSTEM',    defect: 'BRAKES-LININGS/PADS' },
      { category: 'BRAKE SYSTEM',    defect: 'BRAKES-ADJUSTMENT' },
    ],
  },
  {
    id: 'INSP-ONEA01797038', type: 'inspection', date: '2025-09-26',
    startTime: '07:52', endTime: '09:07', cvir: 'ONEA01797038',
    location: 'Peel District',
    driverName: 'SARNA, YATHARTH', driverLicence: 'S06347890950710', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: 'DS271', plate: 'BT86102', jurisdiction: 'CAON' },
    vehicle2: { make: 'UTL', unit: '711', plate: 'TSF462', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 1, driverPoints: 0,
    oosCount: 1, totalDefects: 1, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'BRAKE SYSTEM', defect: 'AIR SUPPLY-LINES DAMAGED', oos: true },
    ],
  },
  {
    id: 'INSP-ONEA01793801', type: 'inspection', date: '2025-09-16',
    startTime: '12:35', endTime: '13:48', cvir: 'ONEA01793801',
    location: 'OPP',
    driverName: 'CHEEMA, SANDEEP SINGH', driverLicence: 'C33056898890311', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'FRHT', unit: 'DS280', plate: 'PA86823', jurisdiction: 'CAON' },
    vehicle2: { make: 'MANA', unit: '', plate: '28108L', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 1, driverPoints: 0,
    oosCount: 1, totalDefects: 1, charged: 'Y', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'BODY', defect: 'UPPER RAIL (>30′)-BROKEN', oos: true },
    ],
  },
  {
    id: 'COLL-052222345', type: 'collision', date: '2025-09-12', time: '15:40',
    ticket: '4162889x', location: 'HALTON HILLS, 401',
    driverName: 'SINGH, MANINDER', driverLicence: 'S44905160931211', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: '', unit: '', plate: 'PB17400', jurisdiction: 'CAON' },
    pointsTotal: 2,
    collision: {
      collisionClass: 'CLASS-PROPERTY DAMAGE ONLY', jurisdiction: 'CAON',
      vehicleAction: 'VEH ACTN-GOING AHEAD', vehicleCondition: 'VEH COND-NO APPARENT DEFECT',
      driverAction: 'DR ACT-FOLLOWING TOO CLOSE', driverCondition: 'DR COND-NORMAL',
      driverCharged: 'Y', points: 2, microfilm: '052222345',
    },
  },
  {
    id: 'INSP-ONEA01790256', type: 'inspection', date: '2025-09-02',
    startTime: '12:56', endTime: '14:04', cvir: 'ONEA01790256',
    location: 'Vineland TIS',
    driverName: 'HANS, SUKHWINDER S', driverLicence: 'H04697268660403', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'FRHT', unit: 'DS284', plate: 'PA98866', jurisdiction: 'CAON' },
    vehicle2: { make: 'UTIL', unit: 'VE284', plate: 'TPV584', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 0, driverPoints: 0,
    oosCount: 0, totalDefects: 4, charged: 'Y', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'TRIP INSPECTION', defect: 'TRIP INSPECTION - IMPROPER' },
      { category: 'BRAKE SYSTEM',    defect: 'BRAKES-ADJUSTMENT' },
      { category: 'BRAKE SYSTEM',    defect: 'BRAKES' },
      { category: 'REGISTRATION',    defect: 'REGISTRATION - NO PERMIT' },
    ],
  },
  {
    id: 'INSP-ONEA01787529', type: 'inspection', date: '2025-08-20',
    startTime: '18:37', endTime: '19:39', cvir: 'ONEA01787529',
    location: 'Victoria TIS',
    driverName: 'ABHITEJ SINGH', driverLicence: 'A10450000000807', driverLicenceJurisdiction: 'CAON',
    vehicle1: { make: 'VOLV', unit: 'DS283', plate: 'BN16533', jurisdiction: 'CAON' },
    vehicle2: { make: 'GREA', unit: '92064', plate: 'K5922K', jurisdiction: 'CAON' },
    level: 1, numVehicles: 2, vehiclePoints: 1, driverPoints: 0,
    oosCount: 1, totalDefects: 3, charged: 'N', coDriver: 'N', impoundment: 'N',
    defects: [
      { category: 'LOAD SECURITY',   defect: 'LD SECURITY-INSECURE LD/GENPROV', oos: true },
      { category: 'WHEELS/RIMS',     defect: 'WHEELS/RIMS - DISC WHL - CRK/DMG' },
      { category: 'TRIP INSPECTION', defect: 'TRIP INSPECTION - IMPROPER' },
    ],
  },
];
