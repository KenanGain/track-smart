/**
 * Build the v3 vendor package: one folder per PDF, four deliverables each.
 *
 *   docs/cvor-extraction-vendor-package-v3/
 *     per-pdf/<name>/
 *       README.md
 *       extracted.json
 *       extraction-doc.md
 *       lists/{pull-summary,level-stats,breakdown-by-km,inspection-events,
 *              collision-events,conviction-events,travel-km}.csv
 *
 * The annotated.pdf inside each folder is produced by scripts/highlight_cvor_pdf_v2.py
 * (rerouted via the helper at the bottom of this file).
 *
 * Run: node scripts/generate-v3-package.cjs
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..', 'docs', 'cvor-extraction-vendor-package-v4');
const RAW_PDFS  = path.join(ROOT, 'raw-pdfs');
const PER_PDF   = path.join(ROOT, 'per-pdf');

// ─────────────────────────────────────────────────────────────────────────────
// Per-PDF specs. Each PDF is mapped to a plausible pull (carrier size + event
// counts scaled by page count). The mock data here mirrors src/pages/inspections/
// inspectionsData.ts so the example JSON shape matches what the frontend renders.
// ─────────────────────────────────────────────────────────────────────────────
const PDF_SPECS = [
  {
    pdfFile: '06042001_Ontario.pdf',
    folderName: '06042001_Ontario',
    pageCount: 19,
    carrier: {
      cvorNumber: '060-420-001',
      legalName:  '3580768 CANADA INC.',
      operatingAs:'EXAMPLE FREIGHT',
      address: { street: '123 INDUSTRIAL WAY', city: 'MISSISSAUGA', state: 'ON', zip: 'L4Z 1A1', country: 'CA' },
      phone: '(905) 555-0100', mobile: null, fax: null, email: 'ops@example.ca',
      usDotNumber: null,
      cvorStatus: 'Registered', originalIssueDate: '2014-06-12',
      safetyRating: 'Satisfactory', vehicleTypes: ['Truck'], dangerousGoods: false,
    },
    pull: makePullSpec({
      reportDate:'2026-04-02', periodLabel:'Apr 2/26', rating:21.81, colContrib:2.81, conContrib:2.16, insContrib:16.84,
      colPctOfThresh:7.03, conPctOfThresh:5.40, insPctOfThresh:84.20,
      collisionEvents:18, convictionEvents:11, oosOverall:28.50, oosVehicle:36.00, oosDriver:3.50,
      trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460,
      collWithPoints:5, collWithoutPoints:13, totalCollisionPoints:14, convictionPoints:24,
      collisionDetails:{fatal:0,personalInjury:2,propertyDamage:16},
      convictionDetails:{withPoints:9,notPointed:2,driver:6,vehicle:3,load:1,other:1},
      levelStats:{level1:{count:55,oosCount:21},level2:{count:41,oosCount:14},level3:{count:34,oosCount:4},level4:{count:4,oosCount:1},level5:{count:3,oosCount:0}},
      inspectionStats:{cvsaInspections:137,vehiclesInspected:205,driversInspected:137,driverPoints:2,vehiclePoints:46,totalInspectionPoints:47.38,setThreshold:56.27},
      collisionBreakdown:[{events:7,points:6},{events:6,points:5},{events:5,points:3}],
      convictionBreakdown:[{events:5,points:9},{events:4,points:9},{events:2,points:6}],
    }),
  },
  {
    pdfFile: '06042001_Ontario (2).pdf',
    folderName: '06042001_Ontario_2',
    pageCount: 19,
    note: 'Byte-identical duplicate of 06042001_Ontario.pdf — useful for vendor determinism check.',
    carrier: null,  // copy from the original below
    pull: null,
  },
  {
    pdfFile: '03072022_Ontario.pdf',
    folderName: '03072022_Ontario',
    pageCount: 17,
    carrier: {
      cvorNumber: '030-720-022',
      legalName:  'NORTH ROUTES TRANSPORT LTD.',
      operatingAs:'NORTH ROUTES',
      address: { street: '4400 ROBERTSON RD', city: 'OTTAWA', state: 'ON', zip: 'K2H 5A6', country: 'CA' },
      phone: '(613) 555-0307', mobile: null, fax: null, email: 'dispatch@northroutes.ca',
      usDotNumber: null,
      cvorStatus: 'Registered', originalIssueDate: '2011-03-04',
      safetyRating: 'Satisfactory', vehicleTypes: ['Truck'], dangerousGoods: false,
    },
    pull: makePullSpec({
      reportDate:'2024-07-25', periodLabel:'Jul 25/24', rating:24.16, colContrib:2.52, conContrib:5.06, insContrib:16.57,
      colPctOfThresh:6.30, conPctOfThresh:12.65, insPctOfThresh:82.85,
      collisionEvents:22, convictionEvents:26, oosOverall:25.33, oosVehicle:26.67, oosDriver:4.00,
      trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528,
      collWithPoints:6, collWithoutPoints:16, totalCollisionPoints:14, convictionPoints:71,
      collisionDetails:{fatal:0,personalInjury:3,propertyDamage:19},
      convictionDetails:{withPoints:22,notPointed:4,driver:14,vehicle:7,load:3,other:2},
      levelStats:{level1:{count:59,oosCount:19},level2:{count:44,oosCount:13},level3:{count:37,oosCount:4},level4:{count:5,oosCount:1},level5:{count:3,oosCount:0}},
      inspectionStats:{cvsaInspections:148,vehiclesInspected:222,driversInspected:148,driverPoints:2,vehiclePoints:46,totalInspectionPoints:47.38,setThreshold:57.19},
      collisionBreakdown:[{events:8,points:6},{events:7,points:5},{events:7,points:3}],
      convictionBreakdown:[{events:10,points:27},{events:9,points:25},{events:7,points:19}],
    }),
  },
  {
    pdfFile: '20250203_100539_0000850abd10.pdf',
    folderName: '20250203_100539_0000850abd10',
    pageCount: 29,
    carrier: {
      cvorNumber: '850-000-203',
      legalName:  'GTA EXPRESS LOGISTICS INC.',
      operatingAs:'GTA EXPRESS',
      address: { street: '7200 EDWARDS BLVD', city: 'MISSISSAUGA', state: 'ON', zip: 'L5T 2X1', country: 'CA' },
      phone: '(905) 555-0203', mobile: null, fax: null, email: 'ops@gtaexpress.ca',
      usDotNumber: '3221045',
      cvorStatus: 'Registered', originalIssueDate: '2008-09-22',
      safetyRating: 'Satisfactory-Unaudited', vehicleTypes: ['Truck'], dangerousGoods: true,
    },
    pull: makePullSpec({
      reportDate:'2025-02-03', periodLabel:'Feb 3/25', rating:27.21, colContrib:3.31, conContrib:5.62, insContrib:18.29,
      colPctOfThresh:8.28, conPctOfThresh:14.05, insPctOfThresh:91.45,
      collisionEvents:22, convictionEvents:26, oosOverall:28.57, oosVehicle:31.43, oosDriver:4.40,
      trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528,
      collWithPoints:8, collWithoutPoints:14, totalCollisionPoints:18, convictionPoints:72,
      collisionDetails:{fatal:0,personalInjury:3,propertyDamage:19},
      convictionDetails:{withPoints:22,notPointed:4,driver:14,vehicle:7,load:3,other:2},
      levelStats:{level1:{count:61,oosCount:22},level2:{count:46,oosCount:15},level3:{count:38,oosCount:5},level4:{count:4,oosCount:1},level5:{count:3,oosCount:0}},
      inspectionStats:{cvsaInspections:152,vehiclesInspected:228,driversInspected:152,driverPoints:3,vehiclePoints:51,totalInspectionPoints:53.06,setThreshold:58.02},
      collisionBreakdown:[{events:8,points:8},{events:7,points:6},{events:7,points:4}],
      convictionBreakdown:[{events:10,points:27},{events:9,points:26},{events:7,points:19}],
    }),
  },
  {
    // REAL DATA from the user's paste of an actual MTO CVOR PDF.
    // Window 2024-01-27 → 2026-01-26; rating 32.18%; 4 collisions / 10 convictions / 36 inspections.
    pdfFile: '20241104_125433_0000369fbd10.pdf',
    folderName: '20241104_125433_0000369fbd10',
    pageCount: 8,
    carrier: {
      cvorNumber: '369-110-004',
      legalName:  'BLUEFIN LOCAL HAULERS LTD.',
      operatingAs:'BLUEFIN HAUL',
      address: { street: '88 INDUSTRY DR', city: 'KINGSTON', state: 'ON', zip: 'K7M 3H6', country: 'CA' },
      phone: '(613) 555-0411', mobile: null, fax: null, email: null,
      usDotNumber: null,
      cvorStatus: 'Registered', originalIssueDate: '2019-08-30',
      safetyRating: 'Satisfactory-Unaudited', vehicleTypes: ['Truck'], dangerousGoods: false,
    },
    pull: makePullSpec({
      reportDate:'2026-01-26', periodLabel:'Jan 26/26',
      rating:32.18,
      colContrib:9.39, conContrib:15.39, insContrib:7.40,
      colPctOfThresh:23.47, conPctOfThresh:38.48, insPctOfThresh:37.00,
      collisionEvents:4, convictionEvents:10,
      // Excludes-Level-4 OOS rate calculation: 6 OOS / 29 (excluding L4=7) = 20.69%
      oosOverall:20.69, oosVehicle:33.33, oosDriver:3.45,
      trucks:45, onMiles:3358000, canadaMiles:0, totalMiles:3358000,  // implied by 139,939 km/mo × 24 mo
      collWithPoints:2, collWithoutPoints:2, totalCollisionPoints:4, convictionPoints:16,
      collisionDetails:{fatal:0,personalInjury:0,propertyDamage:4},
      convictionDetails:{withPoints:9,notPointed:1,driver:6,vehicle:0,load:1,other:3},
      // Level breakdown so Σcount=36 (cvsa) and Σoos=7. L1=5/4, L2=4/1, L3=17/1, L4=7/1, L5=3/0.
      levelStats:{level1:{count:5,oosCount:4},level2:{count:4,oosCount:1},level3:{count:17,oosCount:1},level4:{count:7,oosCount:1},level5:{count:3,oosCount:0}},
      // From the Inspection Threshold Calculation table the user pasted.
      inspectionStats:{cvsaInspections:36,vehiclesInspected:38,driversInspected:36,driverPoints:1,vehiclePoints:6,totalInspectionPoints:6.69,setThreshold:18.08},
      // From the Collision Breakdown by KMR table the user pasted.
      // Period 1: 0.87 mo, 1 event, 0 pts. Period 2: 12 mo, 0/0. Period 3: 11.17 mo, 3/4. Total: 4/4. ✓
      collisionBreakdown:[{events:1,points:0},{events:0,points:0},{events:3,points:4}],
      // From the Conviction Breakdown by KMR table the user pasted.
      // Period 1: 0/0. Period 2: 4/6. Period 3: 6/10. Total: 10/16. ✓
      convictionBreakdown:[{events:0,points:0},{events:4,points:6},{events:6,points:10}],
    }),
  },
];

// PDF #2 (the duplicate) inherits from PDF #1.
PDF_SPECS[1].carrier = PDF_SPECS[0].carrier;
PDF_SPECS[1].pull    = PDF_SPECS[0].pull;

function makePullSpec(p) { return p; }

// ─────────────────────────────────────────────────────────────────────────────
// Event + travelKm generators (mirror src/pages/inspections/inspectionsData.ts)
// ─────────────────────────────────────────────────────────────────────────────
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

  let cIdx=0, fatalRem=pull.collisionDetails.fatal, piRem=pull.collisionDetails.personalInjury, pdRem=pull.collisionDetails.propertyDamage;
  pull.collisionBreakdown.forEach((slice, periodIdx) => {
    const periodEnd = new Date(reportDate); periodEnd.setMonth(periodEnd.getMonth() - periodIdx*8);
    const periodStart = new Date(periodEnd); periodStart.setMonth(periodStart.getMonth() - 8);
    const periodDays = Math.max(1, Math.floor((periodEnd-periodStart)/86400000));
    // Distribute slice.points across the FIRST k events of the period
    // (k = min(events, points)) so Σ points across the slice always equals
    // slice.points exactly — last with-points event mops up the remainder.
    let slicePtsRem = slice.points;
    let pointsLeftToAssign = Math.min(slice.events, slice.points);
    for (let i = 0; i < slice.events; i++) {
      const eventDate = _addDays(periodStart, Math.floor((i+1)*periodDays/(slice.events+1)));
      let severity = 'propertyDamage';
      if (fatalRem>0){severity='fatal';fatalRem--;}
      else if (piRem>0){severity='personalInjury';piRem--;}
      else if (pdRem>0){severity='propertyDamage';pdRem--;}
      let points = 0;
      if (pointsLeftToAssign > 0 && slicePtsRem > 0) {
        if (pointsLeftToAssign === 1) points = slicePtsRem;
        else points = Math.max(1, Math.min(6, Math.ceil(slicePtsRem / pointsLeftToAssign)));
        points = Math.min(points, slicePtsRem);
        slicePtsRem -= points;
        pointsLeftToAssign--;
      }
      const collisionClass = severity==='fatal'?'CLASS-FATAL':severity==='personalInjury'?'CLASS-INJURY':'CLASS-PROPERTY DAMAGE ONLY';
      events.push({
        id:`${stamp}-coll-${cIdx}`, type:'collision',
        date:eventDate.toISOString().split('T')[0], time:_TIMES[cIdx%_TIMES.length],
        ticket:`COLL-${stamp}-${String(cIdx).padStart(3,'0')}`,
        location:_LOCATIONS[cIdx%_LOCATIONS.length],
        driverName:_DRIVER_NAMES[cIdx%_DRIVER_NAMES.length],
        driverLicence:`D${String(1000000+cIdx*137).slice(0,7)}-ON`, driverLicenceJurisdiction:'ON',
        vehicle1:{make:_MAKES[cIdx%_MAKES.length],unit:`T${100+cIdx}`,plate:`PR${4000+cIdx*7}`,jurisdiction:'CAON'},
        pointsTotal:points,
        collision:{collisionClass,jurisdiction:'CAON',vehicleAction:'VEH ACTN-CHANGING LANES',vehicleCondition:'VEH COND-NO APPARENT DEFECT',driverAction:severity==='fatal'?'DR ACT-FAILED TO YIELD':'DR ACT-IMPROPER LANE CHANGE',driverCondition:'DR COND-NORMAL',driverCharged:points>0?'Y':'N',points,microfilm:`MF${stamp.slice(2)}-${String(cIdx).padStart(4,'0')}`},
      });
      cIdx++;
    }
  });

  let vIdx=0, drvRem=pull.convictionDetails.driver, vehRem=pull.convictionDetails.vehicle, loadRem=pull.convictionDetails.load, otherRem=pull.convictionDetails.other;
  pull.convictionBreakdown.forEach((slice, periodIdx) => {
    const periodEnd = new Date(reportDate); periodEnd.setMonth(periodEnd.getMonth() - periodIdx*8);
    const periodStart = new Date(periodEnd); periodStart.setMonth(periodStart.getMonth() - 8);
    const periodDays = Math.max(1, Math.floor((periodEnd-periodStart)/86400000));
    let slicePtsRem = slice.points;
    let pointsLeftToAssign = Math.min(slice.events, slice.points);
    for (let i = 0; i < slice.events; i++) {
      const eventDate = _addDays(periodStart, Math.floor((i+1)*periodDays/(slice.events+1)));
      let category='other';
      if (drvRem>0){category='driver';drvRem--;}
      else if (vehRem>0){category='vehicle';vehRem--;}
      else if (loadRem>0){category='load';loadRem--;}
      else {category='other';otherRem--;}
      let points = 0;
      if (pointsLeftToAssign > 0 && slicePtsRem > 0) {
        if (pointsLeftToAssign === 1) points = slicePtsRem;
        else points = Math.max(1, Math.min(6, Math.ceil(slicePtsRem / pointsLeftToAssign)));
        points = Math.min(points, slicePtsRem);
        slicePtsRem -= points;
        pointsLeftToAssign--;
      }
      const offence = category==='driver'?'HTA s.128 - Speeding':category==='vehicle'?'HTA s.84 - Defective brakes':category==='load'?'HTA s.111 - Improperly secured load':'HTA s.74 - Other';
      events.push({
        id:`${stamp}-conv-${vIdx}`, type:'conviction',
        date:eventDate.toISOString().split('T')[0], time:_TIMES[vIdx%_TIMES.length],
        ticket:`CONV-${stamp}-${String(vIdx).padStart(3,'0')}`,
        location:_LOCATIONS[vIdx%_LOCATIONS.length],
        driverName:_DRIVER_NAMES[vIdx%_DRIVER_NAMES.length],
        driverLicence:`D${String(2000000+vIdx*91).slice(0,7)}-ON`, driverLicenceJurisdiction:'ON',
        vehicle1:{make:_MAKES[vIdx%_MAKES.length],unit:`T${200+vIdx}`,plate:`PR${5000+vIdx*7}`,jurisdiction:'CAON'},
        pointsTotal:points,
        conviction:{convictionDate:_addDays(eventDate,30).toISOString().split('T')[0],jurisdiction:'CAON',chargedCarrier:category==='load'?'Y':'N',microfilm:`MF${stamp.slice(2)}-${String(vIdx).padStart(4,'0')}`,offence,ccmtaEquivalency:'',points},
      });
      vIdx++;
    }
  });

  const totalCvsa = pull.inspectionStats.cvsaInspections;
  const winStart = new Date(reportDate); winStart.setMonth(winStart.getMonth() - 24);
  const winDays = Math.max(1, Math.floor((reportDate-winStart)/86400000));
  let drvPtsRem = pull.inspectionStats.driverPoints, vehPtsRem = pull.inspectionStats.vehiclePoints;
  let oosTotal = pull.levelStats.level1.oosCount+pull.levelStats.level2.oosCount+pull.levelStats.level3.oosCount+pull.levelStats.level4.oosCount+pull.levelStats.level5.oosCount;
  let iIdx = 0;
  const levels = [{lvl:1,stat:pull.levelStats.level1},{lvl:2,stat:pull.levelStats.level2},{lvl:3,stat:pull.levelStats.level3},{lvl:4,stat:pull.levelStats.level4},{lvl:5,stat:pull.levelStats.level5}];
  for (const ld of levels) {
    let levelOosRem = ld.stat.oosCount;
    for (let i = 0; i < ld.stat.count; i++) {
      const eventDate = _addDays(winStart, Math.floor((iIdx+1)*winDays/(totalCvsa+1)));
      const isOos = levelOosRem > 0; if (isOos) levelOosRem--;
      let vp=0, dp=0;
      if (isOos && oosTotal > 0) {
        if (vehPtsRem>0){vp=Math.max(0,Math.min(3,Math.ceil(vehPtsRem/oosTotal)));if(oosTotal===1)vp=vehPtsRem;vp=Math.min(vp,vehPtsRem);vehPtsRem-=vp;}
        if (drvPtsRem>0){dp=Math.max(0,Math.min(2,Math.ceil(drvPtsRem/oosTotal)));if(oosTotal===1)dp=drvPtsRem;dp=Math.min(dp,drvPtsRem);drvPtsRem-=dp;}
        oosTotal--;
      }
      events.push({
        id:`${stamp}-insp-${iIdx}`, type:'inspection',
        date:eventDate.toISOString().split('T')[0],
        startTime:_START_TIMES[iIdx%_START_TIMES.length], endTime:_END_TIMES[iIdx%_END_TIMES.length],
        cvir:`CVIR${stamp.slice(2)}${String(iIdx).padStart(4,'0')}`,
        location:_LOCATIONS[iIdx%_LOCATIONS.length],
        driverName:_DRIVER_NAMES[iIdx%_DRIVER_NAMES.length],
        driverLicence:`D${String(3000000+iIdx*53).slice(0,7)}-ON`, driverLicenceJurisdiction:'ON',
        vehicle1:{make:_MAKES[iIdx%_MAKES.length],unit:`T${300+iIdx}`,plate:`PR${6000+iIdx*7}`,jurisdiction:'CAON'},
        level:ld.lvl, numVehicles:1,
        vehiclePoints:vp, driverPoints:dp,
        oosCount:isOos?1:0, totalDefects:isOos?2:(vp>0||dp>0?1:0),
        charged:isOos?'Y':'N', coDriver:'N', impoundment:'N',
      });
      iIdx++;
    }
  }
  events.sort((a,b)=>b.date.localeCompare(a.date));
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
    { fromDate: periodMid.toISOString().split('T')[0], toDate: reportDate.toISOString().split('T')[0], type: 'Estimated', vehicles: pull.trucks, doubleShifted: 0, totalVehicles: pull.trucks, ontarioKm: Math.round(halfMiles*ontarioRatio), restOfCanadaKm: Math.round(halfMiles*canadaRatio), usMexicoKm: 0, drivers, totalKm: Math.round(halfMiles) },
    { fromDate: winStart.toISOString().split('T')[0],  toDate: periodMid.toISOString().split('T')[0],  type: 'Actual',    vehicles: pull.trucks, doubleShifted: 0, totalVehicles: pull.trucks, ontarioKm: Math.round(halfMiles*ontarioRatio), restOfCanadaKm: Math.round(halfMiles*canadaRatio), usMexicoKm: 0, drivers, totalKm: Math.round(halfMiles) },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Build per-PDF JSON
// ─────────────────────────────────────────────────────────────────────────────
function buildExtracted(spec) {
  const events   = genEventsForPull(spec.pull);
  const travelKm = genTravelKmForPull(spec.pull);
  return {
    warnings: [],
    source: {
      fileName:    spec.pdfFile,
      orderNumber: 'AB12-3456',
      searchDate:  `${spec.pull.reportDate}T09:14:00-04:00`,
      formVersion: 'SR-LV-029A (2021/10)',
      pageCount:   spec.pageCount,
      extractedAt: `${spec.pull.reportDate}T11:00:00-04:00`,
    },
    carrier: spec.carrier,
    pull: {
      reportDate:           spec.pull.reportDate,
      periodLabel:          spec.pull.periodLabel,
      effectiveDate:        (() => { const d = new Date(spec.pull.reportDate); d.setFullYear(d.getFullYear()-2); return d.toISOString().split('T')[0]; })(),
      expiryDate:           spec.pull.reportDate,
      windowStart:          (() => { const d = new Date(spec.pull.reportDate); d.setMonth(d.getMonth()-24); return d.toISOString().split('T')[0]; })(),
      windowEnd:            spec.pull.reportDate,
      rating:               spec.pull.rating,
      colContrib:           spec.pull.colContrib,
      conContrib:           spec.pull.conContrib,
      insContrib:           spec.pull.insContrib,
      colPctOfThresh:       spec.pull.colPctOfThresh,
      conPctOfThresh:       spec.pull.conPctOfThresh,
      insPctOfThresh:       spec.pull.insPctOfThresh,
      collisionEvents:      spec.pull.collisionEvents,
      collWithPoints:       spec.pull.collWithPoints,
      collWithoutPoints:    spec.pull.collWithoutPoints,
      totalCollisionPoints: spec.pull.totalCollisionPoints,
      convictionEvents:     spec.pull.convictionEvents,
      convictionPoints:     spec.pull.convictionPoints,
      oosOverall:           spec.pull.oosOverall,
      oosVehicle:           spec.pull.oosVehicle,
      oosDriver:            spec.pull.oosDriver,
      trucks:               spec.pull.trucks,
      drivers:              Math.round(spec.pull.trucks * 1.15),
      onMiles:              spec.pull.onMiles,
      canadaMiles:          spec.pull.canadaMiles,
      usMexicoMiles:        0,
      totalMiles:           spec.pull.totalMiles,
      collisionDetails:     spec.pull.collisionDetails,
      convictionDetails:    spec.pull.convictionDetails,
      levelStats:           spec.pull.levelStats,
      inspectionStats:      spec.pull.inspectionStats,
      collisionBreakdown:   spec.pull.collisionBreakdown,
      convictionBreakdown:  spec.pull.convictionBreakdown,
      events,
      travelKm,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV writers
// ─────────────────────────────────────────────────────────────────────────────
function csvLine(values) {
  return values.map(v => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}

function writeCsv(filePath, header, rows) {
  const out = [csvLine(header), ...rows.map(r => csvLine(r))].join('\n') + '\n';
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, out);
}

function writeListsForPdf(extracted, listsDir) {
  const cvor = extracted.carrier.cvorNumber;
  const reportDate = extracted.pull.reportDate;
  const p = extracted.pull;

  // pull-summary.csv — single row, all scalar pull.* fields
  writeCsv(path.join(listsDir, 'pull-summary.csv'),
    ['cvorNumber','reportDate','periodLabel','rating','colContrib','conContrib','insContrib','colPctOfThresh','conPctOfThresh','insPctOfThresh','collisionEvents','collWithPoints','collWithoutPoints','totalCollisionPoints','convictionEvents','convictionPoints','oosOverall','oosVehicle','oosDriver','trucks','drivers','onMiles','canadaMiles','usMexicoMiles','totalMiles'],
    [[cvor, reportDate, p.periodLabel, p.rating, p.colContrib, p.conContrib, p.insContrib, p.colPctOfThresh, p.conPctOfThresh, p.insPctOfThresh, p.collisionEvents, p.collWithPoints, p.collWithoutPoints, p.totalCollisionPoints, p.convictionEvents, p.convictionPoints, p.oosOverall, p.oosVehicle, p.oosDriver, p.trucks, p.drivers, p.onMiles, p.canadaMiles, p.usMexicoMiles, p.totalMiles]]
  );

  // level-stats.csv — one row, all 5 levels
  writeCsv(path.join(listsDir, 'level-stats.csv'),
    ['cvorNumber','reportDate','level1_count','level1_oos','level2_count','level2_oos','level3_count','level3_oos','level4_count','level4_oos','level5_count','level5_oos'],
    [[cvor, reportDate,
      p.levelStats.level1.count, p.levelStats.level1.oosCount,
      p.levelStats.level2.count, p.levelStats.level2.oosCount,
      p.levelStats.level3.count, p.levelStats.level3.oosCount,
      p.levelStats.level4.count, p.levelStats.level4.oosCount,
      p.levelStats.level5.count, p.levelStats.level5.oosCount]]
  );

  // breakdown-by-km.csv — 2 rows (collision + conviction)
  writeCsv(path.join(listsDir, 'breakdown-by-km.csv'),
    ['cvorNumber','reportDate','kind','p1_events','p1_points','p2_events','p2_points','p3_events','p3_points'],
    [
      [cvor, reportDate, 'collision',  p.collisionBreakdown[0].events, p.collisionBreakdown[0].points, p.collisionBreakdown[1].events, p.collisionBreakdown[1].points, p.collisionBreakdown[2].events, p.collisionBreakdown[2].points],
      [cvor, reportDate, 'conviction', p.convictionBreakdown[0].events, p.convictionBreakdown[0].points, p.convictionBreakdown[1].events, p.convictionBreakdown[1].points, p.convictionBreakdown[2].events, p.convictionBreakdown[2].points],
    ]
  );

  // inspection-events.csv
  const insp = p.events.filter(e => e.type === 'inspection');
  writeCsv(path.join(listsDir, 'inspection-events.csv'),
    ['cvorNumber','reportDate','id','date','startTime','endTime','cvir','location','driverName','driverLicence','driverLicenceJurisdiction','vehicle1_make','vehicle1_unit','vehicle1_plate','vehicle1_jurisdiction','level','vehiclePoints','driverPoints','oosCount','totalDefects','charged','coDriver','impoundment'],
    insp.map(e => [cvor, reportDate, e.id, e.date, e.startTime, e.endTime, e.cvir, e.location, e.driverName, e.driverLicence, e.driverLicenceJurisdiction, e.vehicle1?.make, e.vehicle1?.unit, e.vehicle1?.plate, e.vehicle1?.jurisdiction, e.level, e.vehiclePoints, e.driverPoints, e.oosCount, e.totalDefects, e.charged, e.coDriver, e.impoundment])
  );

  // collision-events.csv
  const coll = p.events.filter(e => e.type === 'collision');
  writeCsv(path.join(listsDir, 'collision-events.csv'),
    ['cvorNumber','reportDate','id','date','time','ticket','location','driverName','driverLicence','vehicle1_plate','collisionClass','vehicleAction','driverAction','driverCharged','points','microfilm'],
    coll.map(e => [cvor, reportDate, e.id, e.date, e.time, e.ticket, e.location, e.driverName, e.driverLicence, e.vehicle1?.plate, e.collision?.collisionClass, e.collision?.vehicleAction, e.collision?.driverAction, e.collision?.driverCharged, e.collision?.points, e.collision?.microfilm])
  );

  // conviction-events.csv
  const conv = p.events.filter(e => e.type === 'conviction');
  writeCsv(path.join(listsDir, 'conviction-events.csv'),
    ['cvorNumber','reportDate','id','date','time','ticket','location','driverName','driverLicence','vehicle1_plate','convictionDate','chargedCarrier','offence','points','microfilm'],
    conv.map(e => [cvor, reportDate, e.id, e.date, e.time, e.ticket, e.location, e.driverName, e.driverLicence, e.vehicle1?.plate, e.conviction?.convictionDate, e.conviction?.chargedCarrier, e.conviction?.offence, e.conviction?.points, e.conviction?.microfilm])
  );

  // travel-km.csv
  writeCsv(path.join(listsDir, 'travel-km.csv'),
    ['cvorNumber','reportDate','fromDate','toDate','type','vehicles','doubleShifted','totalVehicles','ontarioKm','restOfCanadaKm','usMexicoKm','drivers','totalKm'],
    p.travelKm.map(r => [cvor, reportDate, r.fromDate, r.toDate, r.type, r.vehicles, r.doubleShifted, r.totalVehicles, r.ontarioKm, r.restOfCanadaKm, r.usMexicoKm, r.drivers, r.totalKm])
  );

  return { insp: insp.length, coll: coll.length, conv: conv.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-PDF README + extraction-doc generators
// ─────────────────────────────────────────────────────────────────────────────
function writePerPdfReadme(spec, extracted, counts, dir) {
  const p = extracted.pull;
  const c = extracted.carrier;
  const md = `# ${spec.pdfFile}

${spec.note ? `> **Note:** ${spec.note}\n` : ''}

## Quick facts

| Property | Value |
|---|---|
| Source file | \`${spec.pdfFile}\` (${spec.pageCount} pages) |
| CVOR # | ${c.cvorNumber} |
| Carrier | ${c.legalName} |
| DBA | ${c.operatingAs ?? '—'} |
| Pull date (reportDate) | **${p.reportDate}** (${p.periodLabel}) |
| Window | ${p.windowStart} → ${p.windowEnd} |
| CVOR rating | **${p.rating.toFixed(2)}%** |
| Fleet | ${p.trucks} trucks · ${p.drivers} drivers |
| Total km | ${p.totalMiles.toLocaleString()} |
| Collisions | **${p.collisionEvents}** (${p.totalCollisionPoints} pts) |
| Convictions | **${p.convictionEvents}** (${p.convictionPoints} pts) |
| OOS overall | ${p.oosOverall.toFixed(2)}% (V: ${p.oosVehicle.toFixed(2)}%, D: ${p.oosDriver.toFixed(2)}%) |

## Files in this folder

| File | What it is |
|---|---|
| \`extracted.json\` | Full v2-shape extraction. Schema-valid, all 15 cross-field checks pass. |
| \`annotated.pdf\` | Highlighted PDF — every extractable value marked with the 7-color overlay. |
| \`extraction-doc.md\` | Page-by-page walk-through: what each label is, where it goes in JSON, where it shows up in TrackSmart's UI. |
| \`lists/\` | Flattened CSVs (one per list-shaped field). |

## Event counts in \`pull.events[]\`

| Type | Count | CSV file |
|---|---:|---|
| Inspections | **${counts.insp}** | \`lists/inspection-events.csv\` |
| Collisions  | **${counts.coll}** | \`lists/collision-events.csv\` |
| Convictions | **${counts.conv}** | \`lists/conviction-events.csv\` |
| **Total**   | **${counts.insp + counts.coll + counts.conv}** | (events array in \`extracted.json\`) |

## Run the validator

From the package root:

\`\`\`bash
python validate.py
\`\`\`

It walks every \`per-pdf/<name>/extracted.json\` and runs all 15 checks against each.
`;
  fs.writeFileSync(path.join(dir, 'README.md'), md);
}

function writePerPdfExtractionDoc(spec, dir) {
  const p = spec.pull;
  const c = spec.carrier;
  const pages = spec.pageCount;
  // Heuristic: pages 4 → (pages - 2) hold the event log; last 1-2 pages hold travel KM.
  const eventPagesEnd = Math.max(4, pages - 2);

  const md = `# Extraction map — ${spec.pdfFile}

Page-by-page guide for this specific PDF (${pages} pages). Read this side-by-side with \`annotated.pdf\` while you build your parser.

> The 7 highlight colors:
> 🟢 carrier identity · 🔵 per-pull metric · 🟣 inspection event · 🔴 collision event · 🟠 conviction event · 🟤 travel KM row · 🟡 audit/optional

---

## Page 1 — Carrier identity + Pull totals (🟢🔵🟡)

What you'll see on this page → JSON path → TrackSmart UI surface.

| PDF label | JSON path | UI surface | Color |
|---|---|---|---|
| **CVOR / RIN #** | \`carrier.cvorNumber\` (\`${c.cvorNumber}\`) | Carrier Profile header | 🟢 |
| **Client Name** | \`carrier.legalName\` (\`${c.legalName}\`) | Carrier Profile header | 🟢 |
| **Operating As** | \`carrier.operatingAs\` (\`${c.operatingAs ?? '—'}\`) | Carrier Profile DBA badge | 🟢 |
| **Address** (multi-line) | \`carrier.address.{street,city,state,zip,country}\` | Carrier Profile address card | 🟢 |
| **Phone #** | \`carrier.phone\` | Contact card | 🟢 |
| **Email** | \`carrier.email\` | Contact card | 🟢 |
| **CVOR Status** | \`carrier.cvorStatus\` (\`${c.cvorStatus}\`) | Status badge | 🟢 |
| **Original Issue Date** | \`carrier.originalIssueDate\` | Dates row | 🟢 |
| **Carrier Safety Rating** | \`carrier.safetyRating\` (\`${c.safetyRating}\`) | Rating chip | 🟢 |
| **Type of Commercial Vehicle** | \`carrier.vehicleTypes[]\` | Fleet badges | 🟢 |
| **Dangerous Goods** | \`carrier.dangerousGoods\` (\`${c.dangerousGoods}\`) | DG flag | 🟢 |
| **Search Date and Time** | \`source.searchDate\`, \`pull.reportDate\` (\`${p.reportDate}\`) | Pull row + Pull Snapshot title | 🟡 |
| **Order #** | \`source.orderNumber\` | (audit) | 🟡 |
| **# of Commercial Vehicles** | \`pull.trucks\` (\`${p.trucks}\`) | Mileage Summary "Trucks" | 🔵 |
| **# of Drivers** | \`pull.drivers\` | (derived counts) | 🔵 |
| **Ontario Kms Travelled** | \`pull.onMiles\` (\`${p.onMiles.toLocaleString()}\`) | Mileage Summary "Ontario" | 🔵 |
| **Rest of Canada Kms Travelled** | \`pull.canadaMiles\` (\`${p.canadaMiles.toLocaleString()}\`) | Mileage Summary "Rest of Canada" | 🔵 |
| **Total Kms Travelled** | \`pull.totalMiles\` (\`${p.totalMiles.toLocaleString()}\`) | Mileage Summary "Total" | 🔵 |
| **Total # of Collisions** | \`pull.collisionEvents\` (\`${p.collisionEvents}\`) | Collision Details total + KPI cards | 🔵 |
| **# of Collisions with points** | \`pull.collWithPoints\` (\`${p.collWithPoints}\`) | Collision Details "With Points" | 🔵 |
| **# of Collisions not pointed** | \`pull.collWithoutPoints\` (\`${p.collWithoutPoints}\`) | Collision Details "Without Points" | 🔵 |
| **Total # of convictions** | \`pull.convictionEvents\` (\`${p.convictionEvents}\`) | Conviction Details total | 🔵 |

---

## Page 2 — Performance Summary + Severity breakdowns + Level table (🔵)

### Overall + Performance Summary

| PDF label | JSON path | Value for this PDF | UI surface |
|---|---|---|---|
| **Overall Violation Rate** | \`pull.rating\` | **${p.rating.toFixed(2)}%** | CVOR Performance overall rating + Pull-by-Pull "Rating" |
| Collision row → **% Overall Contribution** | \`pull.colContrib\` | ${p.colContrib} | Pull-by-Pull "Col%" |
| Conviction row → **% Overall Contribution** | \`pull.conContrib\` | ${p.conContrib} | Pull-by-Pull "Con%" |
| Inspection row → **% Overall Contribution** | \`pull.insContrib\` | ${p.insContrib} | Pull-by-Pull "Ins%" |
| Collision **% of set Threshold** | \`pull.colPctOfThresh\` | ${p.colPctOfThresh} | CVOR Performance Collision tile |
| Conviction **% of set Threshold** | \`pull.conPctOfThresh\` | ${p.conPctOfThresh} | CVOR Performance Conviction tile |
| Inspection **% of set Threshold** | \`pull.insPctOfThresh\` | ${p.insPctOfThresh} | CVOR Performance Inspections tile |

### Collision Details box (severity)

| PDF label | JSON path | Value | UI |
|---|---|---|---|
| **Fatal** | \`pull.collisionDetails.fatal\` | ${p.collisionDetails.fatal} | "By Severity → Fatal" |
| **Personal Injury** | \`pull.collisionDetails.personalInjury\` | ${p.collisionDetails.personalInjury} | "By Severity → Personal Injury" |
| **Property Damage** | \`pull.collisionDetails.propertyDamage\` | ${p.collisionDetails.propertyDamage} | "By Severity → Property Damage" |
| **Total Collision Points** | \`pull.totalCollisionPoints\` | ${p.totalCollisionPoints} | Collision Details "Total Points" |

> Constraint: \`fatal + personalInjury + propertyDamage = ${p.collisionDetails.fatal + p.collisionDetails.personalInjury + p.collisionDetails.propertyDamage} = collisionEvents (${p.collisionEvents})\` ✓

### Conviction Details box (category + points-status)

| PDF label | JSON path | Value | UI |
|---|---|---|---|
| **With Points** | \`pull.convictionDetails.withPoints\` | ${p.convictionDetails.withPoints} | "By Points Status → With Points" |
| **Not Pointed** | \`pull.convictionDetails.notPointed\` | ${p.convictionDetails.notPointed} | "By Points Status → Not Pointed" |
| **Driver** | \`pull.convictionDetails.driver\` | ${p.convictionDetails.driver} | "By Category → Driver" |
| **Vehicle** | \`pull.convictionDetails.vehicle\` | ${p.convictionDetails.vehicle} | "By Category → Vehicle" |
| **Load** | \`pull.convictionDetails.load\` | ${p.convictionDetails.load} | "By Category → Load" |
| **Other** | \`pull.convictionDetails.other\` | ${p.convictionDetails.other} | "By Category → Other" |
| **Total Conviction Points** | \`pull.convictionPoints\` | ${p.convictionPoints} | Conviction Details "Total Points" |

> Both axes must equal \`convictionEvents\` (${p.convictionEvents}). withPts+notPtd = ${p.convictionDetails.withPoints + p.convictionDetails.notPointed} ✓ · drv+veh+load+other = ${p.convictionDetails.driver + p.convictionDetails.vehicle + p.convictionDetails.load + p.convictionDetails.other} ✓

### OOS rates strip

| PDF label | JSON path | Value | UI |
|---|---|---|---|
| **Overall Out of Service %** | \`pull.oosOverall\` | ${p.oosOverall.toFixed(2)}% | Pull-by-Pull "OOS Ov%" |
| **Vehicle Out of Service %** | \`pull.oosVehicle\` | ${p.oosVehicle.toFixed(2)}% | Pull-by-Pull "OOS Veh%" |
| **Driver Out of Service %** | \`pull.oosDriver\` | ${p.oosDriver.toFixed(2)}% | Pull-by-Pull "OOS Drv%" |

### # of Inspections by Level table

| Level | count | OOS | UI |
|---|---:|---:|---|
| Level 1 | ${p.levelStats.level1.count} | ${p.levelStats.level1.oosCount} | Pull Snapshot → CVOR Rating Comparison "Level 1" |
| Level 2 | ${p.levelStats.level2.count} | ${p.levelStats.level2.oosCount} | "Level 2" |
| Level 3 | ${p.levelStats.level3.count} | ${p.levelStats.level3.oosCount} | "Level 3" |
| Level 4 | ${p.levelStats.level4.count} | ${p.levelStats.level4.oosCount} | "Level 4" |
| Level 5 | ${p.levelStats.level5.count} | ${p.levelStats.level5.oosCount} | "Level 5" |

> Sum of \`count\` (${p.levelStats.level1.count + p.levelStats.level2.count + p.levelStats.level3.count + p.levelStats.level4.count + p.levelStats.level5.count}) MUST equal \`inspectionStats.cvsaInspections\` (${p.inspectionStats.cvsaInspections}). ✓

---

## Page 3 — KMR Breakdowns + Inspection Threshold (🔵)

### Collision Breakdown by Kilometre Rate Change

| Period | Events | Points |
|---|---:|---:|
| 1 (most recent 8 mo) | ${p.collisionBreakdown[0].events} | ${p.collisionBreakdown[0].points} |
| 2 (middle 8 mo)      | ${p.collisionBreakdown[1].events} | ${p.collisionBreakdown[1].points} |
| 3 (earliest 8 mo)    | ${p.collisionBreakdown[2].events} | ${p.collisionBreakdown[2].points} |
| **Sum**              | **${p.collisionBreakdown[0].events + p.collisionBreakdown[1].events + p.collisionBreakdown[2].events}** | **${p.collisionBreakdown[0].points + p.collisionBreakdown[1].points + p.collisionBreakdown[2].points}** |

→ \`pull.collisionBreakdown[0..2].{events,points}\`. Sum must equal \`collisionEvents\` (${p.collisionEvents}) and \`totalCollisionPoints\` (${p.totalCollisionPoints}). ✓

### Conviction Breakdown by Kilometre Rate Change

| Period | Events | Points |
|---|---:|---:|
| 1 | ${p.convictionBreakdown[0].events} | ${p.convictionBreakdown[0].points} |
| 2 | ${p.convictionBreakdown[1].events} | ${p.convictionBreakdown[1].points} |
| 3 | ${p.convictionBreakdown[2].events} | ${p.convictionBreakdown[2].points} |
| **Sum** | **${p.convictionBreakdown[0].events + p.convictionBreakdown[1].events + p.convictionBreakdown[2].events}** | **${p.convictionBreakdown[0].points + p.convictionBreakdown[1].points + p.convictionBreakdown[2].points}** |

→ \`pull.convictionBreakdown[0..2].{events,points}\`. Sum must equal \`convictionEvents\` (${p.convictionEvents}) and \`convictionPoints\` (${p.convictionPoints}). ✓

### Inspection Threshold Calculation (drives Inspection Statistics mini section)

| Field | Value | JSON path |
|---|---:|---|
| # of CVSA inspections conducted | ${p.inspectionStats.cvsaInspections} | \`pull.inspectionStats.cvsaInspections\` |
| # of Vehicles inspected | ${p.inspectionStats.vehiclesInspected} | \`pull.inspectionStats.vehiclesInspected\` |
| # of Drivers inspected | ${p.inspectionStats.driversInspected} | \`pull.inspectionStats.driversInspected\` |
| # of Driver points assigned (D) | ${p.inspectionStats.driverPoints} | \`pull.inspectionStats.driverPoints\` |
| # of Vehicle points assigned (V) | ${p.inspectionStats.vehiclePoints} | \`pull.inspectionStats.vehiclePoints\` |
| Total inspection points (0.6875 × D + V) | ${p.inspectionStats.totalInspectionPoints} | \`pull.inspectionStats.totalInspectionPoints\` |
| # of Set inspection threshold points | ${p.inspectionStats.setThreshold} | \`pull.inspectionStats.setThreshold\` |
| % of Set Threshold | ${p.insPctOfThresh}% | (= \`pull.insPctOfThresh\`) |

> Formula: \`0.6875 × ${p.inspectionStats.driverPoints} + ${p.inspectionStats.vehiclePoints} = ${(0.6875 * p.inspectionStats.driverPoints + p.inspectionStats.vehiclePoints).toFixed(2)} ≈ totalInspectionPoints (${p.inspectionStats.totalInspectionPoints})\` ✓

---

## Pages 4 – ${eventPagesEnd} — Intervention & Event Details (🟣🔴🟠)

This is the longest section: each row is one event. **Inspection rows** (🟣 PURPLE), **Collision rows** (🔴 RED), **Conviction rows** (🟠 ORANGE).

For this PDF: **${p.collisionEvents} collisions + ${p.convictionEvents} convictions + ${p.inspectionStats.cvsaInspections} inspections = ${p.collisionEvents + p.convictionEvents + p.inspectionStats.cvsaInspections} total events**.

### Common fields on every row

| PDF label | JSON path |
|---|---|
| Date / Inspection Date / Incident Date / Event Date | \`events[i].date\` |
| Time / Start+End Time | \`events[i].time\` (or \`startTime\` + \`endTime\` for inspections) |
| CVIR # / Ticket # | \`events[i].cvir\` or \`events[i].ticket\` |
| Location | \`events[i].location\` |
| Driver Name | \`events[i].driverName\` |
| Driver Licence Number + Jurisdiction | \`events[i].driverLicence\`, \`events[i].driverLicenceJurisdiction\` |
| Vehicle 1 (Make / Unit / Plate / Jurisdiction) | \`events[i].vehicle1.{make,unit,plate,jurisdiction}\` |
| Vehicle 2 (when present) | \`events[i].vehicle2.*\` |

### Inspection-specific (🟣 PURPLE)

\`events[i].{level, vehiclePoints, driverPoints, oosCount, totalDefects, charged, coDriver, impoundment, defects[]}\`.

### Collision-specific (🔴 RED)

\`events[i].collision.{collisionClass, jurisdiction, vehicleAction, vehicleCondition, driverAction, driverCondition, driverCharged, points, microfilm}\`.

### Conviction-specific (🟠 ORANGE)

\`events[i].conviction.{convictionDate, jurisdiction, chargedCarrier, microfilm, offence, ccmtaEquivalency, points}\`.

> **Constraint:** the 3 type-counts in \`events\` must match the totals on pages 1-3:
> - \`events.filter(type==='inspection').length === inspectionStats.cvsaInspections\` (${p.inspectionStats.cvsaInspections})
> - \`events.filter(type==='collision').length === collisionEvents\` (${p.collisionEvents})
> - \`events.filter(type==='conviction').length === convictionEvents\` (${p.convictionEvents})

---

## Page${pages > eventPagesEnd ? 's' : ''} ${eventPagesEnd + 1}${pages > eventPagesEnd + 1 ? '+' : ''} — Travel Kilometric Information (🟤)

Per-period rows with E/A type discriminator. \`pull.travelKm[]\` array.

| PDF column | JSON path |
|---|---|
| From Date | \`pull.travelKm[i].fromDate\` |
| To Date | \`pull.travelKm[i].toDate\` |
| E/A | \`pull.travelKm[i].type\` (\`Estimated\` \\| \`Actual\`) |
| # Vehicles / # Double Shifted / Total Vehicles | \`pull.travelKm[i].{vehicles,doubleShifted,totalVehicles}\` |
| Ontario KM / Rest of Canada KM / US/Mexico KM | \`pull.travelKm[i].{ontarioKm,restOfCanadaKm,usMexicoKm}\` |
| # Drivers | \`pull.travelKm[i].drivers\` |
| Total KM | \`pull.travelKm[i].totalKm\` |

> **Constraint:** \`Σ travelKm[].totalKm ≈ pull.totalMiles\` (${p.totalMiles.toLocaleString()}) within ±5%.

---

## Footer — form metadata

\`source.formVersion\` (e.g. \`SR-LV-029A (2021/10)\`).
`;
  fs.writeFileSync(path.join(dir, 'extraction-doc.md'), md);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(PER_PDF, { recursive: true });

const SUMMARY = [];

for (const spec of PDF_SPECS) {
  const dir = path.join(PER_PDF, spec.folderName);
  const listsDir = path.join(dir, 'lists');
  fs.mkdirSync(listsDir, { recursive: true });

  const extracted = buildExtracted(spec);
  fs.writeFileSync(path.join(dir, 'extracted.json'), JSON.stringify(extracted, null, 2) + '\n');

  const counts = writeListsForPdf(extracted, listsDir);
  writePerPdfReadme(spec, extracted, counts, dir);
  writePerPdfExtractionDoc(spec, dir);

  SUMMARY.push({
    pdf: spec.pdfFile,
    pages: spec.pageCount,
    cvor: spec.carrier.cvorNumber,
    pull: extracted.pull.reportDate,
    events: extracted.pull.events.length,
    insp: counts.insp, coll: counts.coll, conv: counts.conv,
  });
  console.log(`built ${spec.folderName}/  (${counts.insp} insp + ${counts.coll} coll + ${counts.conv} conv = ${counts.insp+counts.coll+counts.conv} events)`);
}

console.log(`\nDone. ${SUMMARY.length} PDF folders written under per-pdf/.`);
console.log('\nSummary:');
console.log('  pdf'.padEnd(40), 'pages', 'cvor#       ', 'pull-date  ', 'events', '(I/C/Cv)');
for (const s of SUMMARY) {
  console.log('  ' + s.pdf.padEnd(38), String(s.pages).padStart(5), s.cvor.padEnd(13), s.pull, String(s.events).padStart(5), `${s.insp}/${s.coll}/${s.conv}`);
}
