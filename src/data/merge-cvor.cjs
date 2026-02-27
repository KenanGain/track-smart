const fs = require('fs');

const dbPath = 'c:\\Users\\kenan\\Full prototpye code\\src\\data\\violations.data.ts';
const cvorPath = 'c:\\Users\\kenan\\Full prototpye code\\src\\data\\parsed-cvor.json';

const dbText = fs.readFileSync(dbPath, 'utf8');
const searchString = 'export const VIOLATION_DATA: ViolationData = {';
const startIndex = dbText.indexOf(searchString);

if (startIndex === -1) {
  console.error("Could not find the start of VIOLATION_DATA!");
  process.exit(1);
}

const prefix = dbText.substring(0, startIndex + searchString.length - 1); // up to " = " (but keep the brace inside JSON)
let jsonText = dbText.substring(startIndex + searchString.length - 1); // starts with "{"

const lastBraceIndex = jsonText.lastIndexOf('}');
if (lastBraceIndex === -1) {
    console.error("Could not find the closing brace!");
    process.exit(1);
}

// Extract just the valid JSON object
const validJsonText = jsonText.substring(0, lastBraceIndex + 1);
const suffix = jsonText.substring(lastBraceIndex + 1);

let db;
try {
  db = JSON.parse(validJsonText);
} catch (e) {
  console.error("Failed to parse DB JSON:");
  console.error(e);
  // print snippet
  console.error("Starts with:", validJsonText.substring(0, 50));
  console.error("Ends with:", validJsonText.substring(validJsonText.length - 50));
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
  let found = false;
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
    if (found) break;
  }

  if (!found) {
     addedCount++;
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
        _source: "cvor_bulk_import"
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

const newFileContent = prefix + JSON.stringify(db, null, 2) + suffix;
fs.writeFileSync(dbPath, newFileContent);
console.log('✅ Updated violations.data.ts successfully!');
