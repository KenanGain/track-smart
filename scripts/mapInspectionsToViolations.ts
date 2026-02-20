import fs from 'fs';
import path from 'path';

async function main() {
  const { inspectionsData } = await import('../src/pages/inspections/inspectionsData.js');
  
  // Read VIOLATION_DATA directly since it imports don't work due to aliases
  const vdataPath = path.join(process.cwd(), 'src/data/violations.data.ts');
  const contentVdata = fs.readFileSync(vdataPath, 'utf-8');
  const startIndex = contentVdata.indexOf('export const VIOLATION_DATA: ViolationData = ');
  const jsonStart = startIndex + 'export const VIOLATION_DATA: ViolationData = '.length;
  const jsonEnd = contentVdata.lastIndexOf(';');
  const vdataJson = JSON.parse(contentVdata.substring(jsonStart, jsonEnd).trim());
  const ALL_VIOLATIONS = Object.values(vdataJson.categories).flatMap((c: any) => c.items);

  const getViolation = (id: string, code: string) => {
    // Try to find by code if id is not perfectly matched (since they were auto-added)
    let v = ALL_VIOLATIONS.find((v: any) => v.violationCode === code);
    if (!v) v = ALL_VIOLATIONS.find((v: any) => v.id === id);
    return v;
  };

  const newRecords: any[] = [];
  const newAssetRecords: any[] = [];

  for (const insp of inspectionsData) {
    if (!insp.violations || insp.violations.length === 0) continue;

    for (let i = 0; i < insp.violations.length; i++) {
        const vData = insp.violations[i];
        
        // Find exact violation def
        const def = getViolation('some_id', vData.code);
        if (!def) {
            console.log(`Could not find violation definition for code ${vData.code}`);
            continue;
        }

        const baseRecord = {
          id: `VINSP-${insp.id}-${i}`,
          date: insp.date,
          time: '12:00', // Default if time missing from inspection
          locationState: insp.state,
          violationCode: def.violationCode,
          violationDataId: def.id,
          violationType: def.violationDescription,
          violationGroup: def.violationGroup,
          crashLikelihood: Math.min(def.crashLikelihoodPercent ?? 0, 100),
          driverRiskCategory: def.driverRiskCategory,
          isOos: vData.oos || false,
          result: vData.oos ? 'OOS Order' : 'Citation Issued',
          fineAmount: vData.oos ? 500 : 200,
          expenseAmount: 0,
          currency: 'USD',
          expenses: vData.oos ? 500 : 200,
          status: 'Closed',
        };

        // If driver violations exist, split them. Or just add all to driver and all to asset logically.
        // For this demo, let's just add them all to both if they are vehicle maintenance, 
        // or just driver if driver related. 
        // Wait, the prompt says "driver and asset related to it, that same list going to show it violation properly mapped"
        
        const driverNameParts = insp.driver.split(', ');
        const driverName = driverNameParts.length === 2 ? `${driverNameParts[1]} ${driverNameParts[0]}` : insp.driver;

        // Add to Driver Records
        newRecords.push({
            ...baseRecord,
            driverId: `DRV-INSP-${insp.id}`, // Mock ID
            driverName: driverName,
            driverType: 'Company Driver',
            driverExperience: '5 Years',
            locationCity: 'Unknown City',
            locationStreet: 'Inspection Station',
            locationZip: '00000',
            locationCountry: 'US',
            assetName: insp.vehiclePlate,
        });

        // Add to Asset Records if vehicle related
        if (vData.category === 'Vehicle Maintenance') {
            newAssetRecords.push({
                ...baseRecord,
                id: `AVINSP-${insp.id}-${i}`,
                assetId: `AST-${insp.id}`,
                assetName: insp.vehiclePlate,
                assetUnitNumber: insp.units && insp.units.length > 0 ? insp.units[0].license : insp.vehiclePlate,
                assetMakeModel: insp.units && insp.units.length > 0 ? insp.units[0].type : insp.vehicleType,
                assetPlate: insp.vehiclePlate,
                assetType: insp.vehicleType,
                linkedDriverId: `DRV-INSP-${insp.id}`,
                linkedDriverName: driverName,
                crashLikelihoodPercent: Math.min(def.crashLikelihoodPercent ?? 0, 100), // Asset uses different key
                locationCity: 'Unknown City',
                locationStreet: 'Inspection Station',
                locationZip: '00000',
                locationCountry: 'US',
            });
        }
    }
  }

  console.log(`Generated ${newRecords.length} driver records and ${newAssetRecords.length} asset records from inspections.`);
  
  // Now we need to append these to violations-list.data.ts
  const dataPath = path.join(process.cwd(), 'src/pages/violations/violations-list.data.ts');
  let content = fs.readFileSync(dataPath, 'utf-8');

  // Find where MOCK_VIOLATION_RECORDS is defined
  const replacement1 = `
const INSP_RECORDS = ${JSON.stringify(newRecords, null, 2)};
export const MOCK_VIOLATION_RECORDS: ViolationRecord[] = [...buildRecords(), ...INSP_RECORDS as any];`;
  
  // if it already has INSP_RECORDS but a different array, just regex replace it
  const regexTarget = /const INSP_RECORDS = \[[\s\S]*?\];\nexport const MOCK_VIOLATION_RECORDS: ViolationRecord\[\] = \[\.\.\.buildRecords\(\), \.\.\.INSP_RECORDS as any\];/;
  if(regexTarget.test(content)) {
     content = content.replace(regexTarget, replacement1);
  } else {
    // If it's the first time running
    const fallbackTarget1 = "export const MOCK_VIOLATION_RECORDS: ViolationRecord[] = buildRecords();";
    if (content.includes(fallbackTarget1)) {
       content = content.replace(fallbackTarget1, replacement1);
    }
  }

  const replacement2 = `
export interface AssetViolationRecord extends ViolationRecord {
  assetId: string;
  assetUnitNumber: string;
  assetMakeModel: string;
  assetPlate: string;
  assetType: string;
  linkedDriverId?: string;
  linkedDriverName?: string;
  crashLikelihoodPercent?: number; 
}
const INSP_ASSET_RECORDS = ${JSON.stringify(newAssetRecords, null, 2)};
export const MOCK_ASSET_VIOLATION_RECORDS: AssetViolationRecord[] = [...INSP_ASSET_RECORDS as any];`;

  if (content.includes('export const MOCK_ASSET_VIOLATION_RECORDS: AssetViolationRecord[]')) {
      content = content.replace(/export interface AssetViolationRecord[\s\S]*?export const MOCK_ASSET_VIOLATION_RECORDS: AssetViolationRecord\[\] = \[\.\.\.INSP_ASSET_RECORDS as any\];/, replacement2);
  } else {
      content += '\n' + replacement2;
  }

  fs.writeFileSync(dataPath, content, 'utf-8');
  console.log("Successfully injected inspection records into violations-list.data.ts");
}

main().catch(console.error);
