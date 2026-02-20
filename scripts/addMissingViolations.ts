import fs from 'fs';
import path from 'path';

// Extract violations directly
const violationsToAdd = [
  { code: "396.3(a)1BOS", category: "Vehicle Maintenance", description: "Brake - Defective brakes >= 20% of service brakes on combo", driverRiskCategory: 1, severity: 0, weight: 3 },
  { code: "393.47A-BSF", category: "Vehicle Maintenance", description: "Brake malfunction causing smoke/fire from wheel end", driverRiskCategory: 1, severity: 4, weight: 3 },
  { code: "393.9A-LCL", category: "Vehicle Maintenance", description: "Lighting - Clearance lamp(s) inoperative", driverRiskCategory: 3, severity: 2, weight: 3 },
  { code: "393.9A-LSML", category: "Vehicle Maintenance", description: "Lighting - Side marker lamp(s) inoperative", driverRiskCategory: 3, severity: 2, weight: 3 },
  { code: "393.45B2-B", category: "Vehicle Maintenance", description: "Air Brake - Hose/tubing damaged or not secured", driverRiskCategory: 2, severity: 4, weight: 3 },
  { code: "393.45D-BAAL", category: "Vehicle Maintenance", description: "Air Brake - Audible air leak at other than a proper connection", driverRiskCategory: 1, severity: 4, weight: 3 },
  { code: "393.45B2-BHTD", category: "Vehicle Maintenance", description: "Air Brake - Hose damage into the outer reinforcement ply", driverRiskCategory: 1, severity: 4, weight: 3 },
  { code: "393.78A-WS", category: "Vehicle Maintenance", description: "Washers - Inoperative washing system", driverRiskCategory: 3, severity: 1, weight: 3 },
  { code: "393.11A1-CSLRR", category: "Vehicle Maintenance", description: "Lower rear retro-reflective sheeting missing", driverRiskCategory: 2, severity: 3, weight: 3 },
  { code: "396.3A1-BALR", category: "Vehicle Maintenance", description: "Air Brake - Fails air loss rate test", driverRiskCategory: 1, severity: 4, weight: 3 },
  { code: "396.3A1-BALAC", category: "Vehicle Maintenance", description: "Brake - Audible air leak from a brake chamber", driverRiskCategory: 2, severity: 4, weight: 3 },
  { code: "396.3A1-ALBV", category: "Vehicle Maintenance", description: "Air Brake - Any leak from a brake valve", driverRiskCategory: 2, severity: 4, weight: 3 },
  { code: "396.3A1-ALATR", category: "Vehicle Maintenance", description: "Air Brake - Any leak from an air tank reservoir", driverRiskCategory: 2, severity: 4, weight: 3 },
  { code: "396.5B-L", category: "Vehicle Maintenance", description: "Lubrication - Oil or grease leak", driverRiskCategory: 2, severity: 3, weight: 3 },
  { code: "395.24D-ELDPT", category: "Hours-of-service Compliance", description: "Failure to produce and transfer ELD records on request", driverRiskCategory: 2, severity: 3, weight: 3 },
  { code: "393.48A-BMBCBD", category: "Vehicle Maintenance", description: "Drum Brake - Missing/broken component(s)", driverRiskCategory: 1, severity: 4, weight: 3 },
  { code: "393.47(e)", category: "Vehicle Maintenance", description: "Brake Out of Adjustment", driverRiskCategory: 2, severity: 4, weight: 3 },
  { code: "393.9A-LLPL", category: "Vehicle Maintenance", description: "Lighting - License plate lamp inoperative", driverRiskCategory: 3, severity: 2, weight: 3 },
  { code: "393.9A-LSLI", category: "Vehicle Maintenance", description: "Lighting - Stop lamps inoperative", driverRiskCategory: 1, severity: 6, weight: 3 },
  { code: "393.9A-LIL", category: "Vehicle Maintenance", description: "Lighting - Identification lamp(s) inoperative", driverRiskCategory: 3, severity: 2, weight: 3 },
  { code: "393.9A-LRLI", category: "Vehicle Maintenance", description: "Lighting - Tail lamp inoperative", driverRiskCategory: 1, severity: 6, weight: 3 },
  { code: "393.9A-LHLI", category: "Vehicle Maintenance", description: "Lighting - Headlamp(s) inoperative", driverRiskCategory: 1, severity: 6, weight: 3 },
  { code: "395.22H4", category: "Hours-of-service Compliance", description: "ELD: Missing blank duty status graph-grids (min 8 days)", driverRiskCategory: 3, severity: 1, weight: 3 },
  { code: "392.2-SLML", category: "Unsafe Driving", description: "State/Local Laws - Failure to maintain lane", driverRiskCategory: 1, severity: 5, weight: 3 },
  { code: "393.9A-HLLH", category: "Vehicle Maintenance", description: "Headlamp(s) fail to operate on low and high beam", driverRiskCategory: 1, severity: 6, weight: 3 },
  { code: "393.11A1-CSURR", category: "Vehicle Maintenance", description: "Upper rear retro-reflective sheeting missing", driverRiskCategory: 2, severity: 3, weight: 3 },
  { code: "393.75C", category: "Vehicle Maintenance", description: "Tires - Less than 2/32 inch tread depth", driverRiskCategory: 1, severity: 8, weight: 3 },
  { code: "393.95A1", category: "Vehicle Maintenance", description: "Fire Extinguisher missing or not properly rated", driverRiskCategory: 3, severity: 2, weight: 3 },
  { code: "393.209(d)", category: "Vehicle Maintenance", description: "Steering system components worn/welded/missing", driverRiskCategory: 1, severity: 6, weight: 3 },
  { code: "393.53(b)", category: "Vehicle Maintenance", description: "Auto airbrake adjustment system fails to compensate", driverRiskCategory: 2, severity: 4, weight: 3 },
  { code: "393.45(b)(2)", category: "Vehicle Maintenance", description: "Brake hose/tubing chafing and/or kinking", driverRiskCategory: 2, severity: 4, weight: 3 },
  { code: "396.5(b)", category: "Vehicle Maintenance", description: "Oil and/or grease leak", driverRiskCategory: 3, severity: 3, weight: 3 },
  { code: "393.48(a)", category: "Vehicle Maintenance", description: "Inoperative/defective brakes", driverRiskCategory: 1, severity: 4, weight: 3 },
  { code: "393.9(a)", category: "Vehicle Maintenance", description: "Inoperative Brake Lamps", driverRiskCategory: 1, severity: 6, weight: 3 },
  { code: "393.45DLUV", category: "Vehicle Maintenance", description: "Brake connections with leaks under vehicle", driverRiskCategory: 2, severity: 4, weight: 3 },
  { code: "393.48A-BMBC", category: "Vehicle Maintenance", description: "All brakes missing/broken components", driverRiskCategory: 1, severity: 4, weight: 3 }
];

async function main() {
  const { VIOLATION_DATA: data } = await import('../src/data/violations.data.js'); // tsx transparently resolves to .ts sometimes, or just use absolute path. Even better, let's just do an absolute file URI.
  // Wait, let's just write the rest:
  const existingIds = new Set();
  Object.values(data.categories).forEach((cat: any) => {
    cat.items.forEach((item: any) => existingIds.add(item.id));
  });

  let added = 0;
  for (const v of violationsToAdd) {
    const id = v.code.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '_auto';
    if (existingIds.has(id)) continue;
    
    const categoryKey = v.category === "Hours-of-service Compliance" ? "hours_of_service" : 
                        v.category === "Unsafe Driving" ? "unsafe_driving" : "vehicle_maintenance";
    
    if (!(data.categories as any)[categoryKey]) continue;

    const crashLikelihoodPercent = v.driverRiskCategory === 1 ? 85 : v.driverRiskCategory === 2 ? 45 : 15;

    (data.categories as any)[categoryKey].items.push({
      id,
      violationCode: v.code,
      violationDescription: v.description,
      violationGroup: "Misc (Auto Added)",
      severityWeight: { driver: v.severity, carrier: v.severity },
      crashLikelihoodPercent,
      driverRiskCategory: v.driverRiskCategory,
      inDsms: true,
      isOos: v.severity >= 6,
      regulatoryCodes: { usa: [] },
    });
    existingIds.add(id);
    added++;
  }

  console.log(`Added ${added} new violations to data.`);
  const dataPath = path.join(process.cwd(), 'src/data/violations.data.ts');
  const newFileContent = `import type { ViolationData } from "@/types/violations.types";\n\nexport const VIOLATION_DATA: ViolationData = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(dataPath, newFileContent, 'utf-8');
}
main().catch(console.error);
