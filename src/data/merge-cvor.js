const fs = require('fs');

const dbPath = 'c:\\Users\\kenan\\Full prototpye code\\src\\data\\violations.data.ts';
const cvorPath = 'c:\\Users\\kenan\\Full prototpye code\\src\\data\\parsed-cvor.json';

const dbText = fs.readFileSync(dbPath, 'utf8');
const startIndex = dbText.indexOf('export const violationsData: ViolationData = {');
const prefix = dbText.substring(0, startIndex + 'export const violationsData: ViolationData = '.length);
const jsonText = dbText.substring(startIndex + 'export const violationsData: ViolationData = '.length).replace(/;$/, '');

let db;
try {
  db = JSON.parse(jsonText);
} catch (e) {
  console.error("Failed to parse DB JSON:", e);
  process.exit(1);
}

const cvorData = require(cvorPath);

// Create Canada category if it doesn't exist
if (!db.categories['canada_provincial']) {
  db.categories['canada_provincial'] = {
    label: "Canadian Provincial / Criminal Offenses",
    _stats: { total: 0, high_risk: 0, moderate_risk: 0, lower_risk: 0 },
    items: []
  };
}

let matchedCount = 0;
let addedCount = 0;

for (const row of cvorData) {
  // Try to find an existing item
  // We can look at existing code, USA CFR, or Canada code
  // Let's do a basic look:
  let found = false;
  
  // Clean up row code to try matching
  const rowCodeStr = row.code.replace(/ /g, '').toLowerCase();

  for (const catKey of Object.keys(db.categories)) {
    const cat = db.categories[catKey];
    for (const item of cat.items) {
      if (!item) continue;
      
      const itemCodeStr = item.violationCode.replace(/ /g, '').toLowerCase();
      let isMatch = false;

      // Match by exact code
      if (itemCodeStr === rowCodeStr) isMatch = true;

      // Match by existing canadaEnforcement.code or section
      if (item.canadaEnforcement) {
         if (item.canadaEnforcement.code && item.canadaEnforcement.code.replace(/ /g, '').toLowerCase() === rowCodeStr) isMatch = true;
         if (item.canadaEnforcement.section && item.canadaEnforcement.section.replace(/ /g, '').toLowerCase() === rowCodeStr) isMatch = true;
      }

      // Very simple partial match for HTA (e.g. HTA 128)
      if (row.code.startsWith('HTA') && item.canadaEnforcement && item.canadaEnforcement.section && item.canadaEnforcement.section.includes(row.code.split(' ')[1])) {
          // If the section includes the HTA section number, it might be a match.
          // Too fuzzy? Ex: "HTA s.48" vs "HTA 128" - wait, let's keep it strict or just append if not matched.
      }

      if (isMatch) {
         found = true;
         matchedCount++;
         
         // Update existing
         item.canadaEnforcement = item.canadaEnforcement || {};
         item.canadaEnforcement.act = item.canadaEnforcement.act || row.act || 'CVOR';
         item.canadaEnforcement.section = item.canadaEnforcement.section || row.code;
         item.canadaEnforcement.code = row.code;
         item.canadaEnforcement.ccmtaCode = item.canadaEnforcement.ccmtaCode || row.ccmta;
         item.canadaEnforcement.category = item.canadaEnforcement.category || (row.sfty === 'S' ? 'Safety' : 'Administrative');
         
         if (!item.canadaEnforcement.descriptions) item.canadaEnforcement.descriptions = {};
         item.canadaEnforcement.descriptions.full = item.canadaEnforcement.descriptions.full || row.desc;
         item.canadaEnforcement.descriptions.conviction = row.desc;

         if (!item.canadaEnforcement.points) item.canadaEnforcement.points = {};
         item.canadaEnforcement.points.nsc = item.canadaEnforcement.points.nsc || row.points;
         item.canadaEnforcement.points.cvor = {
             raw: String(row.points),
             min: row.points,
             max: row.points
         };

         if (!item.canadaEnforcement.cvorClassification) item.canadaEnforcement.cvorClassification = {};
         item.canadaEnforcement.cvorClassification.convictionType = row.con;
         item.canadaEnforcement.cvorClassification.alternativeGroup = row.alt;
         
         break;
      }
    }
    if (found) break; // Move to next row
  }

  if (!found) {
     addedCount++;
     // Determine Risk
     let riskCat = 3;
     let crashLikelihood = 10;
     let driverSev = 2;
     let carrierSev = 2;
     
     if (row.points >= 5) {
         riskCat = 1;
         crashLikelihood = 80;
         driverSev = 10;
         carrierSev = 10;
     } else if (row.points >= 3) {
         riskCat = 2;
         crashLikelihood = 40;
         driverSev = 5;
         carrierSev = 5;
     } else if (row.points > 0) {
         riskCat = 3;
         crashLikelihood = 15;
         driverSev = 3;
         carrierSev = 3;
     } else {
         riskCat = 3;
         crashLikelihood = 5;
         driverSev = 1;
         carrierSev = 1;
     }

     const newItem = {
        id: "cvor_" + Math.random().toString(36).substr(2, 9),
        violationCode: row.code,
        violationDescription: row.desc,
        violationGroup: row.act === 'HTA' ? 'Provincial Highway Traffic' : 
                        row.act === 'CCC' ? 'Criminal Code' : 
                        row.act === 'CAIA' ? 'Compulsory Automobile Insurance' : 'General provincial',
        severityWeight: { driver: driverSev, carrier: carrierSev },
        crashLikelihoodPercent: crashLikelihood,
        driverRiskCategory: riskCat,
        inDsms: false,
        isOos: false,
        regulatoryCodes: {
            usa: [],
            canada: [{
                authority: row.act || 'CVOR',
                reference: [row.code],
                description: row.desc,
                province: ["Ontario"]
            }]
        },
        canadaEnforcement: {
            act: row.act || 'CVOR',
            section: row.code,
            code: row.code,
            ccmtaCode: row.ccmta,
            category: row.sfty === 'S' ? 'Safety' : 'Administrative',
            descriptions: {
                full: row.desc,
                conviction: row.desc
            },
            points: {
                nsc: row.points,
                cvor: {
                   raw: String(row.points),
                   min: row.points,
                   max: row.points
                }
            },
            cvorClassification: {
                convictionType: row.con,
                alternativeGroup: row.alt
            }
        },
        _source: "raw-cvor.txt"
     };
     
     db.categories['canada_provincial'].items.push(newItem);
  }
}

// Update stats
let totalVio = 0, totalHigh = 0, totalMod = 0, totalLow = 0;
for (const catKey of Object.keys(db.categories)) {
    const cat = db.categories[catKey];
    const items = cat.items;
    
    cat._stats.total = items.length;
    cat._stats.high_risk = items.filter(i => i.driverRiskCategory === 1).length;
    cat._stats.moderate_risk = items.filter(i => i.driverRiskCategory === 2).length;
    cat._stats.lower_risk = items.filter(i => i.driverRiskCategory === 3).length;
    
    totalVio += cat._stats.total;
    totalHigh += cat._stats.high_risk;
    totalMod += cat._stats.moderate_risk;
    totalLow += cat._stats.lower_risk;
}

db._overallStats = {
    totalViolations: totalVio,
    highRisk: totalHigh,
    moderateRisk: totalMod,
    lowerRisk: totalLow
};

console.log(`Matched and updated: ${matchedCount}`);
console.log(`Added as new violations: ${addedCount}`);

const newFileContent = prefix + JSON.stringify(db, null, 2) + ';\n';
fs.writeFileSync(dbPath, newFileContent);
console.log('✅ Updated violations.data.ts successfully!');
