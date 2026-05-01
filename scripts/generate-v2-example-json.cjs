/**
 * Generate the v2 example responses for the CVOR vendor package.
 *
 * Mirrors src/pages/inspections/inspectionsData.ts (genEventsForPull +
 * genTravelKmForPull) so the example JSON is internally consistent and
 * the validator's cross-field checks (sums close, severity totals match,
 * level counts == cvsaInspections, etc.) all pass.
 *
 * Outputs:
 *   docs/cvor-extraction-vendor-package-v2/examples/response-single.json
 *   docs/cvor-extraction-vendor-package-v2/examples/expected/<pull>.json
 *
 * Run:  node scripts/generate-v2-example-json.cjs
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const OUT_ROOT = path.join(__dirname, '..', 'docs', 'cvor-extraction-vendor-package-v2', 'examples');

// ──────────────────────────────────────────────────────────────────────────────
// Pull specs (mirrors _cvorPullSpecs in inspectionsData.ts)
// Only fields needed for generation are duplicated here.
// ──────────────────────────────────────────────────────────────────────────────
// All 15 pulls from src/pages/inspections/inspectionsData.ts (cvorPeriodicReports).
// This mirrors the spec literals exactly; the events + travelKm arrays are
// reconstructed by the generators below.
const PULL_SPECS = [
  { reportDate:'2024-06-23', periodLabel:'Jun 23/24', rating:24.29, colContrib:2.52, conContrib:5.17, insContrib:16.59, colPctOfThresh:6.30, conPctOfThresh:12.93, insPctOfThresh:82.95, collisionEvents:21, convictionEvents:27, oosOverall:26.58, oosVehicle:27.69, oosDriver:3.80, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:15, totalCollisionPoints:14, convictionPoints:74,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:18 },
    convictionDetails:{ withPoints:23, notPointed:4, driver:15, vehicle:7, load:3, other:2 },
    levelStats:{ level1:{count:58,oosCount:20}, level2:{count:44,oosCount:14}, level3:{count:36,oosCount:4}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:145, vehiclesInspected:218, driversInspected:145, driverPoints:2, vehiclePoints:45, totalInspectionPoints:46.38, setThreshold:55.91 },
    collisionBreakdown:[ {events:8,points:6}, {events:7,points:5}, {events:6,points:3} ],
    convictionBreakdown:[ {events:10,points:28}, {events:9,points:26}, {events:8,points:20} ] },
  { reportDate:'2024-07-25', periodLabel:'Jul 25/24', rating:24.16, colContrib:2.52, conContrib:5.06, insContrib:16.57, colPctOfThresh:6.30, conPctOfThresh:12.65, insPctOfThresh:82.85, collisionEvents:22, convictionEvents:26, oosOverall:25.33, oosVehicle:26.67, oosDriver:4.00, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:16, totalCollisionPoints:14, convictionPoints:71,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:19 },
    convictionDetails:{ withPoints:22, notPointed:4, driver:14, vehicle:7, load:3, other:2 },
    levelStats:{ level1:{count:59,oosCount:19}, level2:{count:44,oosCount:13}, level3:{count:37,oosCount:4}, level4:{count:5,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:148, vehiclesInspected:222, driversInspected:148, driverPoints:2, vehiclePoints:46, totalInspectionPoints:47.38, setThreshold:57.19 },
    collisionBreakdown:[ {events:8,points:6}, {events:7,points:5}, {events:7,points:3} ],
    convictionBreakdown:[ {events:10,points:27}, {events:9,points:25}, {events:7,points:19} ] },
  { reportDate:'2024-10-21', periodLabel:'Oct 21/24', rating:26.55, colContrib:2.52, conContrib:6.23, insContrib:17.79, colPctOfThresh:6.30, conPctOfThresh:15.58, insPctOfThresh:88.95, collisionEvents:22, convictionEvents:30, oosOverall:27.59, oosVehicle:29.41, oosDriver:4.60, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:16, totalCollisionPoints:14, convictionPoints:86,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:19 },
    convictionDetails:{ withPoints:26, notPointed:4, driver:17, vehicle:7, load:4, other:2 },
    levelStats:{ level1:{count:60,oosCount:21}, level2:{count:45,oosCount:14}, level3:{count:37,oosCount:4}, level4:{count:4,oosCount:2}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:149, vehiclesInspected:224, driversInspected:149, driverPoints:2, vehiclePoints:49, totalInspectionPoints:50.38, setThreshold:56.64 },
    collisionBreakdown:[ {events:8,points:6}, {events:7,points:5}, {events:7,points:3} ],
    convictionBreakdown:[ {events:11,points:32}, {events:10,points:30}, {events:9,points:24} ] },
  { reportDate:'2024-11-20', periodLabel:'Nov 20/24', rating:26.40, colContrib:2.92, conContrib:5.75, insContrib:17.73, colPctOfThresh:7.30, conPctOfThresh:14.38, insPctOfThresh:88.65, collisionEvents:23, convictionEvents:27, oosOverall:27.91, oosVehicle:28.99, oosDriver:4.65, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:7, collWithoutPoints:16, totalCollisionPoints:16, convictionPoints:76,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:20 },
    convictionDetails:{ withPoints:23, notPointed:4, driver:15, vehicle:7, load:3, other:2 },
    levelStats:{ level1:{count:61,oosCount:22}, level2:{count:46,oosCount:14}, level3:{count:38,oosCount:4}, level4:{count:4,oosCount:2}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:152, vehiclesInspected:228, driversInspected:152, driverPoints:2, vehiclePoints:49, totalInspectionPoints:50.38, setThreshold:56.83 },
    collisionBreakdown:[ {events:8,points:6}, {events:8,points:6}, {events:7,points:4} ],
    convictionBreakdown:[ {events:10,points:28}, {events:9,points:27}, {events:8,points:21} ] },
  { reportDate:'2025-01-06', periodLabel:'Jan 6/25',  rating:26.34, colContrib:2.92, conContrib:5.74, insContrib:17.68, colPctOfThresh:7.30, conPctOfThresh:14.35, insPctOfThresh:88.40, collisionEvents:23, convictionEvents:26, oosOverall:27.78, oosVehicle:29.58, oosDriver:4.44, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:7, collWithoutPoints:16, totalCollisionPoints:14, convictionPoints:73,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:20 },
    convictionDetails:{ withPoints:22, notPointed:4, driver:14, vehicle:7, load:3, other:2 },
    levelStats:{ level1:{count:61,oosCount:22}, level2:{count:46,oosCount:14}, level3:{count:39,oosCount:5}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:153, vehiclesInspected:230, driversInspected:153, driverPoints:2, vehiclePoints:49, totalInspectionPoints:50.38, setThreshold:56.99 },
    collisionBreakdown:[ {events:8,points:5}, {events:8,points:5}, {events:7,points:4} ],
    convictionBreakdown:[ {events:10,points:27}, {events:9,points:26}, {events:7,points:20} ] },
  { reportDate:'2025-02-11', periodLabel:'Feb 11/25', rating:27.21, colContrib:3.31, conContrib:5.62, insContrib:18.29, colPctOfThresh:8.28, conPctOfThresh:14.05, insPctOfThresh:91.45, collisionEvents:22, convictionEvents:26, oosOverall:28.57, oosVehicle:31.43, oosDriver:4.40, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:8, collWithoutPoints:14, totalCollisionPoints:18, convictionPoints:72,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:19 },
    convictionDetails:{ withPoints:22, notPointed:4, driver:14, vehicle:7, load:3, other:2 },
    levelStats:{ level1:{count:61,oosCount:22}, level2:{count:46,oosCount:15}, level3:{count:38,oosCount:5}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:152, vehiclesInspected:228, driversInspected:152, driverPoints:3, vehiclePoints:51, totalInspectionPoints:53.06, setThreshold:58.02 },
    collisionBreakdown:[ {events:8,points:8}, {events:7,points:6}, {events:7,points:4} ],
    convictionBreakdown:[ {events:10,points:27}, {events:9,points:26}, {events:7,points:19} ] },
  { reportDate:'2025-05-04', periodLabel:'May 4/25',  rating:26.33, colContrib:3.02, conContrib:5.00, insContrib:18.30, colPctOfThresh:7.55, conPctOfThresh:12.50, insPctOfThresh:91.50, collisionEvents:23, convictionEvents:22, oosOverall:28.72, oosVehicle:33.33, oosDriver:3.19, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:7, collWithoutPoints:16, totalCollisionPoints:16, convictionPoints:61,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:20 },
    convictionDetails:{ withPoints:18, notPointed:4, driver:12, vehicle:6, load:2, other:2 },
    levelStats:{ level1:{count:60,oosCount:22}, level2:{count:45,oosCount:14}, level3:{count:37,oosCount:5}, level4:{count:4,oosCount:2}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:149, vehiclesInspected:224, driversInspected:149, driverPoints:3, vehiclePoints:51, totalInspectionPoints:53.06, setThreshold:57.99 },
    collisionBreakdown:[ {events:8,points:6}, {events:8,points:6}, {events:7,points:4} ],
    convictionBreakdown:[ {events:9,points:23}, {events:7,points:22}, {events:6,points:16} ] },
  { reportDate:'2025-06-02', periodLabel:'Jun 2/25',  rating:27.18, colContrib:3.02, conContrib:4.82, insContrib:19.34, colPctOfThresh:7.55, conPctOfThresh:12.05, insPctOfThresh:96.70, collisionEvents:23, convictionEvents:20, oosOverall:30.77, oosVehicle:36.23, oosDriver:3.30, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:7, collWithoutPoints:16, totalCollisionPoints:16, convictionPoints:58,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:20 },
    convictionDetails:{ withPoints:16, notPointed:4, driver:11, vehicle:5, load:2, other:2 },
    levelStats:{ level1:{count:59,oosCount:23}, level2:{count:44,oosCount:15}, level3:{count:36,oosCount:5}, level4:{count:5,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:147, vehiclesInspected:220, driversInspected:147, driverPoints:3, vehiclePoints:54, totalInspectionPoints:56.06, setThreshold:57.97 },
    collisionBreakdown:[ {events:8,points:6}, {events:8,points:6}, {events:7,points:4} ],
    convictionBreakdown:[ {events:8,points:22}, {events:7,points:21}, {events:5,points:15} ] },
  { reportDate:'2025-07-13', periodLabel:'Jul 13/25', rating:28.39, colContrib:2.74, conContrib:5.07, insContrib:20.58, colPctOfThresh:6.85, conPctOfThresh:12.68, insPctOfThresh:102.90, collisionEvents:23, convictionEvents:22, oosOverall:34.12, oosVehicle:41.94, oosDriver:3.53, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:17, totalCollisionPoints:14, convictionPoints:61,
    collisionDetails:{ fatal:0, personalInjury:4, propertyDamage:19 },
    convictionDetails:{ withPoints:18, notPointed:4, driver:12, vehicle:6, load:2, other:2 },
    levelStats:{ level1:{count:58,oosCount:25}, level2:{count:44,oosCount:17}, level3:{count:36,oosCount:6}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:145, vehiclesInspected:218, driversInspected:145, driverPoints:3, vehiclePoints:58, totalInspectionPoints:60.06, setThreshold:58.37 },
    collisionBreakdown:[ {events:8,points:6}, {events:8,points:5}, {events:7,points:3} ],
    convictionBreakdown:[ {events:9,points:23}, {events:7,points:22}, {events:6,points:16} ] },
  { reportDate:'2025-08-19', periodLabel:'Aug 19/25', rating:28.71, colContrib:2.45, conContrib:4.70, insContrib:21.56, colPctOfThresh:6.13, conPctOfThresh:11.75, insPctOfThresh:107.80, collisionEvents:22, convictionEvents:21, oosOverall:36.36, oosVehicle:45.45, oosDriver:3.90, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:16, totalCollisionPoints:12, convictionPoints:53,
    collisionDetails:{ fatal:0, personalInjury:4, propertyDamage:18 },
    convictionDetails:{ withPoints:17, notPointed:4, driver:11, vehicle:6, load:2, other:2 },
    levelStats:{ level1:{count:57,oosCount:26}, level2:{count:43,oosCount:18}, level3:{count:36,oosCount:6}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:143, vehiclesInspected:215, driversInspected:143, driverPoints:3, vehiclePoints:61, totalInspectionPoints:63.06, setThreshold:58.50 },
    collisionBreakdown:[ {events:8,points:5}, {events:7,points:4}, {events:7,points:3} ],
    convictionBreakdown:[ {events:9,points:21}, {events:7,points:19}, {events:5,points:13} ] },
  { reportDate:'2025-08-20', periodLabel:'Aug 20/25', rating:29.67, colContrib:2.74, conContrib:5.02, insContrib:21.91, colPctOfThresh:6.85, conPctOfThresh:12.55, insPctOfThresh:109.55, collisionEvents:24, convictionEvents:23, oosOverall:36.36, oosVehicle:45.45, oosDriver:3.90, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:18, totalCollisionPoints:14, convictionPoints:59,
    collisionDetails:{ fatal:0, personalInjury:4, propertyDamage:20 },
    convictionDetails:{ withPoints:19, notPointed:4, driver:13, vehicle:6, load:2, other:2 },
    levelStats:{ level1:{count:58,oosCount:26}, level2:{count:43,oosCount:18}, level3:{count:36,oosCount:6}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:144, vehiclesInspected:216, driversInspected:144, driverPoints:3, vehiclePoints:62, totalInspectionPoints:64.06, setThreshold:58.48 },
    collisionBreakdown:[ {events:9,points:6}, {events:8,points:5}, {events:7,points:3} ],
    convictionBreakdown:[ {events:9,points:22}, {events:8,points:21}, {events:6,points:16} ] },
  { reportDate:'2025-10-22', periodLabel:'Oct 22/25', rating:25.62, colContrib:2.39, conContrib:3.06, insContrib:20.17, colPctOfThresh:5.98, conPctOfThresh:7.65,  insPctOfThresh:100.85, collisionEvents:22, convictionEvents:35, oosOverall:31.94, oosVehicle:41.67, oosDriver:4.17, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:5, collWithoutPoints:17, totalCollisionPoints:12, convictionPoints:35,
    collisionDetails:{ fatal:0, personalInjury:4, propertyDamage:18 },
    convictionDetails:{ withPoints:29, notPointed:6, driver:19, vehicle:9, load:4, other:3 },
    levelStats:{ level1:{count:56,oosCount:23}, level2:{count:42,oosCount:15}, level3:{count:35,oosCount:5}, level4:{count:5,oosCount:2}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:141, vehiclesInspected:212, driversInspected:141, driverPoints:3, vehiclePoints:57, totalInspectionPoints:59.06, setThreshold:58.56 },
    collisionBreakdown:[ {events:8,points:5}, {events:7,points:4}, {events:7,points:3} ],
    convictionBreakdown:[ {events:13,points:13}, {events:12,points:13}, {events:10,points:9} ] },
  { reportDate:'2026-01-02', periodLabel:'Jan 2/26',  rating:20.98, colContrib:2.39, conContrib:2.81, insContrib:15.78, colPctOfThresh:5.98, conPctOfThresh:7.03,  insPctOfThresh:78.90,  collisionEvents:21, convictionEvents:14, oosOverall:29.11, oosVehicle:38.46, oosDriver:3.80, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:5, collWithoutPoints:16, totalCollisionPoints:12, convictionPoints:32,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:18 },
    convictionDetails:{ withPoints:11, notPointed:3, driver:8,  vehicle:3, load:2, other:1 },
    levelStats:{ level1:{count:55,oosCount:21}, level2:{count:41,oosCount:14}, level3:{count:35,oosCount:5}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:138, vehiclesInspected:207, driversInspected:138, driverPoints:2, vehiclePoints:43, totalInspectionPoints:44.38, setThreshold:56.25 },
    collisionBreakdown:[ {events:8,points:5}, {events:7,points:4}, {events:6,points:3} ],
    convictionBreakdown:[ {events:6,points:12}, {events:5,points:11}, {events:3,points:9} ] },
  { reportDate:'2026-02-02', periodLabel:'Feb 2/26',  rating:22.31, colContrib:2.81, conContrib:3.00, insContrib:16.49, colPctOfThresh:7.03, conPctOfThresh:7.50,  insPctOfThresh:82.45,  collisionEvents:23, convictionEvents:14, oosOverall:30.00, oosVehicle:42.00, oosDriver:3.75, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:6, collWithoutPoints:17, totalCollisionPoints:14, convictionPoints:34,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:20 },
    convictionDetails:{ withPoints:11, notPointed:3, driver:8,  vehicle:3, load:2, other:1 },
    levelStats:{ level1:{count:56,oosCount:22}, level2:{count:42,oosCount:15}, level3:{count:35,oosCount:5}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:140, vehiclesInspected:210, driversInspected:140, driverPoints:2, vehiclePoints:46, totalInspectionPoints:47.38, setThreshold:57.46 },
    collisionBreakdown:[ {events:8,points:6}, {events:8,points:5}, {events:7,points:3} ],
    convictionBreakdown:[ {events:6,points:13}, {events:5,points:12}, {events:3,points:9} ] },
  { reportDate:'2026-04-02', periodLabel:'Apr 2/26',  rating:21.81, colContrib:2.81, conContrib:2.16, insContrib:16.84, colPctOfThresh:7.03, conPctOfThresh:5.40,  insPctOfThresh:84.20,  collisionEvents:18, convictionEvents:11, oosOverall:28.50, oosVehicle:36.00, oosDriver:3.50, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:5, collWithoutPoints:13, totalCollisionPoints:14, convictionPoints:24,
    collisionDetails:{ fatal:0, personalInjury:2, propertyDamage:16 },
    convictionDetails:{ withPoints:9,  notPointed:2, driver:6,  vehicle:3, load:1, other:1 },
    levelStats:{ level1:{count:55,oosCount:21}, level2:{count:41,oosCount:14}, level3:{count:34,oosCount:4}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:137, vehiclesInspected:205, driversInspected:137, driverPoints:2, vehiclePoints:46, totalInspectionPoints:47.38, setThreshold:56.27 },
    collisionBreakdown:[ {events:7,points:6}, {events:6,points:5}, {events:5,points:3} ],
    convictionBreakdown:[ {events:5,points:9}, {events:4,points:9}, {events:2,points:6} ] },
];

const _addDays = (d, days) => { const r = new Date(d); r.setDate(r.getDate() + days); return r; };

const _DRIVER_NAMES = ['SINGH, M', 'SHARMA, R', 'PATEL, A', 'GREWAL, J', 'DHILLON, K', 'BRAR, H', 'BAJWA, S', 'GILL, P'];
const _LOCATIONS    = ['HWY 401 Toronto, ON', 'HWY 400 Barrie, ON', 'HWY 7 Mississauga, ON', 'HWY 11 North Bay, ON', 'QEW Hamilton, ON', 'HWY 403 Brantford, ON', 'HWY 416 Ottawa, ON'];
const _MAKES        = ['VOLVO', 'FREIGHTLN', 'PETERBILT', 'KENWORTH', 'MACK', 'INTL', 'WESTERN'];
const _TIMES        = ['09:30', '13:45', '16:20', '08:15', '11:00', '14:30', '10:15'];
const _START_TIMES  = ['09:00', '11:30', '13:15', '15:45', '08:30', '14:00', '10:30'];
const _END_TIMES    = ['09:45', '12:15', '13:55', '16:25', '09:10', '14:40', '11:10'];

function genEventsForPull(pull) {
  const events = [];
  const reportDate = new Date(pull.reportDate);
  const stamp = pull.reportDate.replace(/-/g, '');

  // Collisions ────────────────────────────────────────────────────────────
  let cIdx = 0;
  let fatalRem = pull.collisionDetails.fatal;
  let piRem    = pull.collisionDetails.personalInjury;
  let pdRem    = pull.collisionDetails.propertyDamage;
  let withPtsRem = pull.collWithPoints;

  pull.collisionBreakdown.forEach((slice, periodIdx) => {
    const periodEnd = new Date(reportDate);
    periodEnd.setMonth(periodEnd.getMonth() - periodIdx * 8);
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 8);
    const periodDays = Math.max(1, Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000));

    let slicePtsRem = slice.points;
    let sliceWithPts = Math.min(withPtsRem, slice.events);

    for (let i = 0; i < slice.events; i++) {
      const dayOffset = Math.floor((i + 1) * periodDays / (slice.events + 1));
      const eventDate = _addDays(periodStart, dayOffset);

      let severity = 'propertyDamage';
      if (fatalRem > 0)        { severity = 'fatal';          fatalRem--; }
      else if (piRem > 0)      { severity = 'personalInjury'; piRem--;    }
      else if (pdRem > 0)      { severity = 'propertyDamage'; pdRem--;    }

      let points = 0;
      if (sliceWithPts > 0 && slicePtsRem > 0) {
        points = Math.max(1, Math.min(6, Math.ceil(slicePtsRem / sliceWithPts)));
        if (sliceWithPts === 1) points = slicePtsRem;
        points = Math.min(points, slicePtsRem);
        slicePtsRem -= points;
        sliceWithPts--;
        withPtsRem--;
      }

      const collisionClass =
        severity === 'fatal'           ? 'CLASS-FATAL' :
        severity === 'personalInjury'  ? 'CLASS-INJURY' :
                                         'CLASS-PROPERTY DAMAGE ONLY';

      events.push({
        id:                          `${stamp}-coll-${cIdx}`,
        type:                        'collision',
        date:                        eventDate.toISOString().split('T')[0],
        time:                        _TIMES[cIdx % _TIMES.length],
        ticket:                      `COLL-${stamp}-${String(cIdx).padStart(3, '0')}`,
        location:                    _LOCATIONS[cIdx % _LOCATIONS.length],
        driverName:                  _DRIVER_NAMES[cIdx % _DRIVER_NAMES.length],
        driverLicence:               `D${String(1000000 + cIdx * 137).slice(0, 7)}-ON`,
        driverLicenceJurisdiction:   'ON',
        vehicle1:                    { make: _MAKES[cIdx % _MAKES.length], unit: `T${100 + cIdx}`, plate: `PR${4000 + cIdx * 7}`, jurisdiction: 'CAON' },
        pointsTotal:                 points,
        collision: {
          collisionClass,
          jurisdiction:    'CAON',
          vehicleAction:   'VEH ACTN-CHANGING LANES',
          vehicleCondition:'VEH COND-NO APPARENT DEFECT',
          driverAction:    severity === 'fatal' ? 'DR ACT-FAILED TO YIELD' : 'DR ACT-IMPROPER LANE CHANGE',
          driverCondition: 'DR COND-NORMAL',
          driverCharged:   points > 0 ? 'Y' : 'N',
          points,
          microfilm:       `MF${stamp.slice(2)}-${String(cIdx).padStart(4, '0')}`,
        },
      });
      cIdx++;
    }
  });

  // Convictions ───────────────────────────────────────────────────────────
  let vIdx = 0;
  let drvRem   = pull.convictionDetails.driver;
  let vehRem   = pull.convictionDetails.vehicle;
  let loadRem  = pull.convictionDetails.load;
  let otherRem = pull.convictionDetails.other;
  let convWithPtsRem = pull.convictionDetails.withPoints;

  pull.convictionBreakdown.forEach((slice, periodIdx) => {
    const periodEnd = new Date(reportDate);
    periodEnd.setMonth(periodEnd.getMonth() - periodIdx * 8);
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 8);
    const periodDays = Math.max(1, Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000));

    let slicePtsRem = slice.points;
    let sliceWithPts = Math.min(convWithPtsRem, slice.events);

    for (let i = 0; i < slice.events; i++) {
      const dayOffset = Math.floor((i + 1) * periodDays / (slice.events + 1));
      const eventDate = _addDays(periodStart, dayOffset);

      let category = 'other';
      if      (drvRem   > 0) { category = 'driver';  drvRem--;   }
      else if (vehRem   > 0) { category = 'vehicle'; vehRem--;   }
      else if (loadRem  > 0) { category = 'load';    loadRem--;  }
      else                   { category = 'other';   otherRem--; }

      let points = 0;
      if (sliceWithPts > 0 && slicePtsRem > 0) {
        points = Math.max(1, Math.min(6, Math.ceil(slicePtsRem / sliceWithPts)));
        if (sliceWithPts === 1) points = slicePtsRem;
        points = Math.min(points, slicePtsRem);
        slicePtsRem -= points;
        sliceWithPts--;
        convWithPtsRem--;
      }

      const offence =
        category === 'driver'  ? 'HTA s.128 - Speeding' :
        category === 'vehicle' ? 'HTA s.84 - Defective brakes' :
        category === 'load'    ? 'HTA s.111 - Improperly secured load' :
                                 'HTA s.74 - Other';

      events.push({
        id:                          `${stamp}-conv-${vIdx}`,
        type:                        'conviction',
        date:                        eventDate.toISOString().split('T')[0],
        time:                        _TIMES[vIdx % _TIMES.length],
        ticket:                      `CONV-${stamp}-${String(vIdx).padStart(3, '0')}`,
        location:                    _LOCATIONS[vIdx % _LOCATIONS.length],
        driverName:                  _DRIVER_NAMES[vIdx % _DRIVER_NAMES.length],
        driverLicence:               `D${String(2000000 + vIdx * 91).slice(0, 7)}-ON`,
        driverLicenceJurisdiction:   'ON',
        vehicle1:                    { make: _MAKES[vIdx % _MAKES.length], unit: `T${200 + vIdx}`, plate: `PR${5000 + vIdx * 7}`, jurisdiction: 'CAON' },
        pointsTotal:                 points,
        conviction: {
          convictionDate: _addDays(eventDate, 30).toISOString().split('T')[0],
          jurisdiction:   'CAON',
          chargedCarrier: category === 'load' ? 'Y' : 'N',
          microfilm:      `MF${stamp.slice(2)}-${String(vIdx).padStart(4, '0')}`,
          offence,
          ccmtaEquivalency: '',
          points,
        },
      });
      vIdx++;
    }
  });

  // Inspections ───────────────────────────────────────────────────────────
  const totalCvsa = pull.inspectionStats.cvsaInspections;
  const winStart  = new Date(reportDate);
  winStart.setMonth(winStart.getMonth() - 24);
  const winDays   = Math.max(1, Math.floor((reportDate.getTime() - winStart.getTime()) / 86400000));

  let drvPtsRem  = pull.inspectionStats.driverPoints;
  let vehPtsRem  = pull.inspectionStats.vehiclePoints;
  let oosTotal =
    pull.levelStats.level1.oosCount + pull.levelStats.level2.oosCount +
    pull.levelStats.level3.oosCount + pull.levelStats.level4.oosCount +
    pull.levelStats.level5.oosCount;

  let iIdx = 0;
  const levels = [
    { lvl: 1, stat: pull.levelStats.level1 },
    { lvl: 2, stat: pull.levelStats.level2 },
    { lvl: 3, stat: pull.levelStats.level3 },
    { lvl: 4, stat: pull.levelStats.level4 },
    { lvl: 5, stat: pull.levelStats.level5 },
  ];

  for (const ld of levels) {
    let levelOosRem = ld.stat.oosCount;
    for (let i = 0; i < ld.stat.count; i++) {
      const dayOffset = Math.floor((iIdx + 1) * winDays / (totalCvsa + 1));
      const eventDate = _addDays(winStart, dayOffset);
      const isOos = levelOosRem > 0;
      if (isOos) levelOosRem--;

      let vp = 0, dp = 0;
      if (isOos && oosTotal > 0) {
        if (vehPtsRem > 0) {
          vp = Math.max(0, Math.min(3, Math.ceil(vehPtsRem / oosTotal)));
          if (oosTotal === 1) vp = vehPtsRem;
          vp = Math.min(vp, vehPtsRem);
          vehPtsRem -= vp;
        }
        if (drvPtsRem > 0) {
          dp = Math.max(0, Math.min(2, Math.ceil(drvPtsRem / oosTotal)));
          if (oosTotal === 1) dp = drvPtsRem;
          dp = Math.min(dp, drvPtsRem);
          drvPtsRem -= dp;
        }
        oosTotal--;
      }

      events.push({
        id:                          `${stamp}-insp-${iIdx}`,
        type:                        'inspection',
        date:                        eventDate.toISOString().split('T')[0],
        startTime:                   _START_TIMES[iIdx % _START_TIMES.length],
        endTime:                     _END_TIMES[iIdx % _END_TIMES.length],
        cvir:                        `CVIR${stamp.slice(2)}${String(iIdx).padStart(4, '0')}`,
        location:                    _LOCATIONS[iIdx % _LOCATIONS.length],
        driverName:                  _DRIVER_NAMES[iIdx % _DRIVER_NAMES.length],
        driverLicence:               `D${String(3000000 + iIdx * 53).slice(0, 7)}-ON`,
        driverLicenceJurisdiction:   'ON',
        vehicle1:                    { make: _MAKES[iIdx % _MAKES.length], unit: `T${300 + iIdx}`, plate: `PR${6000 + iIdx * 7}`, jurisdiction: 'CAON' },
        level:                       ld.lvl,
        numVehicles:                 1,
        vehiclePoints:               vp,
        driverPoints:                dp,
        oosCount:                    isOos ? 1 : 0,
        totalDefects:                isOos ? 2 : (vp > 0 || dp > 0 ? 1 : 0),
        charged:                     isOos ? 'Y' : 'N',
        coDriver:                    'N',
        impoundment:                 'N',
      });
      iIdx++;
    }
  }

  // Sort by date descending so the events table opens with the newest first.
  events.sort((a, b) => b.date.localeCompare(a.date));
  return events;
}

function genTravelKmForPull(pull) {
  const reportDate = new Date(pull.reportDate);
  const winStart   = new Date(reportDate); winStart.setMonth(winStart.getMonth() - 24);
  const periodMid  = new Date(reportDate); periodMid.setMonth(periodMid.getMonth() - 12);

  const halfMiles    = pull.totalMiles / 2;
  const ontarioRatio = pull.totalMiles > 0 ? pull.onMiles / pull.totalMiles : 0.96;
  const canadaRatio  = pull.totalMiles > 0 ? pull.canadaMiles / pull.totalMiles : 0.04;
  const drivers      = Math.round(pull.trucks * 1.15);

  return [
    {
      fromDate:        periodMid.toISOString().split('T')[0],
      toDate:          reportDate.toISOString().split('T')[0],
      type:            'Estimated',
      vehicles:        pull.trucks,
      doubleShifted:   0,
      totalVehicles:   pull.trucks,
      ontarioKm:       Math.round(halfMiles * ontarioRatio),
      restOfCanadaKm:  Math.round(halfMiles * canadaRatio),
      usMexicoKm:      0,
      drivers,
      totalKm:         Math.round(halfMiles),
    },
    {
      fromDate:        winStart.toISOString().split('T')[0],
      toDate:          periodMid.toISOString().split('T')[0],
      type:            'Actual',
      vehicles:        pull.trucks,
      doubleShifted:   0,
      totalVehicles:   pull.trucks,
      ontarioKm:       Math.round(halfMiles * ontarioRatio),
      restOfCanadaKm:  Math.round(halfMiles * canadaRatio),
      usMexicoKm:      0,
      drivers,
      totalKm:         Math.round(halfMiles),
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Build full v2 response JSON
// ──────────────────────────────────────────────────────────────────────────────
function buildResponse(pull) {
  const events   = genEventsForPull(pull);
  const travelKm = genTravelKmForPull(pull);

  return {
    warnings: [],
    source: {
      fileName:    '06042001_Ontario.pdf',
      orderNumber: 'AB12-3456',
      searchDate:  `${pull.reportDate}T09:14:00-04:00`,
      formVersion: 'SR-LV-029A (2021/10)',
      pageCount:   19,
      extractedAt: `${pull.reportDate}T11:00:00-04:00`,
    },
    carrier: {
      cvorNumber:        '123-456-789',
      legalName:         'EXAMPLE CARRIER LTD.',
      operatingAs:       'EXAMPLE CARRIER',
      address:           { street: '123 INDUSTRIAL WAY', city: 'MISSISSAUGA', state: 'ON', zip: 'L4Z 1A1', country: 'CA' },
      phone:             '(905) 555-0100',
      mobile:            null,
      fax:               null,
      email:             'ops@example.ca',
      usDotNumber:       null,
      cvorStatus:        'Registered',
      originalIssueDate: '2014-06-12',
      safetyRating:      'Satisfactory',
      vehicleTypes:      ['Truck'],
      dangerousGoods:    false,
    },
    pull: {
      reportDate:           pull.reportDate,
      periodLabel:          pull.periodLabel,
      effectiveDate:        (() => { const d = new Date(pull.reportDate); d.setFullYear(d.getFullYear() - 2); return d.toISOString().split('T')[0]; })(),
      expiryDate:           pull.reportDate,
      windowStart:          (() => { const d = new Date(pull.reportDate); d.setMonth(d.getMonth() - 24); return d.toISOString().split('T')[0]; })(),
      windowEnd:            pull.reportDate,
      rating:               pull.rating,
      colContrib:           pull.colContrib,
      conContrib:           pull.conContrib,
      insContrib:           pull.insContrib,
      colPctOfThresh:       pull.colPctOfThresh,
      conPctOfThresh:       pull.conPctOfThresh,
      insPctOfThresh:       pull.insPctOfThresh,
      collisionEvents:      pull.collisionEvents,
      collWithPoints:       pull.collWithPoints,
      collWithoutPoints:    pull.collWithoutPoints,
      totalCollisionPoints: pull.totalCollisionPoints,
      convictionEvents:     pull.convictionEvents,
      convictionPoints:     pull.convictionPoints,
      oosOverall:           pull.oosOverall,
      oosVehicle:           pull.oosVehicle,
      oosDriver:            pull.oosDriver,
      trucks:               pull.trucks,
      drivers:              Math.round(pull.trucks * 1.15),
      onMiles:              pull.onMiles,
      canadaMiles:          pull.canadaMiles,
      usMexicoMiles:        0,
      totalMiles:           pull.totalMiles,
      collisionDetails:     pull.collisionDetails,
      convictionDetails:    pull.convictionDetails,
      levelStats:           pull.levelStats,
      inspectionStats:      pull.inspectionStats,
      collisionBreakdown:   pull.collisionBreakdown,
      convictionBreakdown:  pull.convictionBreakdown,
      events,
      travelKm,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Write outputs
// ──────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(path.join(OUT_ROOT, 'expected'), { recursive: true });

let totalEvents = 0;
let totalPulls = 0;

for (const spec of PULL_SPECS) {
  const resp = buildResponse(spec);
  const inspCount = resp.pull.events.filter(e => e.type === 'inspection').length;
  const colCount  = resp.pull.events.filter(e => e.type === 'collision').length;
  const convCount = resp.pull.events.filter(e => e.type === 'conviction').length;
  console.log(
    `${spec.periodLabel.padEnd(11)}  ` +
    `${String(resp.pull.events.length).padStart(3)} events ` +
    `(${String(inspCount).padStart(3)} insp + ${String(colCount).padStart(2)} coll + ${String(convCount).padStart(2)} conv)  ` +
    `travelKm: ${resp.pull.travelKm.length}`
  );

  // Per-pull expected ground truth
  fs.writeFileSync(
    path.join(OUT_ROOT, 'expected', `${spec.reportDate}.json`),
    JSON.stringify(resp, null, 2) + '\n'
  );

  totalEvents += resp.pull.events.length;
  totalPulls += 1;
}

// Canonical primary example = the LATEST pull (shows the most current snapshot)
const latestSpec = PULL_SPECS[PULL_SPECS.length - 1];
const latestResp = buildResponse(latestSpec);
fs.writeFileSync(
  path.join(OUT_ROOT, 'response-single.json'),
  JSON.stringify(latestResp, null, 2) + '\n'
);

console.log(`\nDone. Wrote ${totalPulls} per-pull JSONs (${totalEvents} events total).`);
console.log('  examples/response-single.json           (latest pull, ' + latestSpec.periodLabel + ')');
console.log('  examples/expected/<reportDate>.json     (one per pull, ' + totalPulls + ' files)');
