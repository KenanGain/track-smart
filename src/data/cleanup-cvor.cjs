/**
 * Cleanup script: Remove all cvor_bulk_import entries from violations.data.ts
 * so the merge script can re-add them cleanly with properly parsed codes.
 */
const fs = require('fs');

const dbPath = 'c:\\Users\\kenan\\Full prototpye code\\src\\data\\violations.data.ts';

const dbText = fs.readFileSync(dbPath, 'utf8');
const searchString = 'export const VIOLATION_DATA: ViolationData = {';
const startIndex = dbText.indexOf(searchString);

if (startIndex === -1) {
  console.error("Could not find the start of VIOLATION_DATA!");
  process.exit(1);
}

const prefix = dbText.substring(0, startIndex + searchString.length - 1);
let jsonText = dbText.substring(startIndex + searchString.length - 1);

const lastBraceIndex = jsonText.lastIndexOf('}');
if (lastBraceIndex === -1) {
  console.error("Could not find the closing brace!");
  process.exit(1);
}

const validJsonText = jsonText.substring(0, lastBraceIndex + 1);
const suffix = jsonText.substring(lastBraceIndex + 1);

let db;
try {
  db = JSON.parse(validJsonText);
} catch (e) {
  console.error("Failed to parse DB JSON:", e.message);
  process.exit(1);
}

let removedCount = 0;

// Remove cvor_bulk_import entries from all categories
for (const catKey of Object.keys(db.categories)) {
  const cat = db.categories[catKey];
  const before = cat.items.length;
  cat.items = cat.items.filter(item => item._source !== 'cvor_bulk_import');
  const after = cat.items.length;
  const removed = before - after;
  if (removed > 0) {
    console.log(`  ${catKey}: removed ${removed} entries (${before} → ${after})`);
    removedCount += removed;
  }
}

// Also clean up canadaEnforcement data from matched items that came from old broken parse
// These will be re-populated by the merge script with correct data
let fixedMatchCount = 0;
for (const catKey of Object.keys(db.categories)) {
  const cat = db.categories[catKey];
  for (const item of cat.items) {
    if (item.canadaEnforcement && item.canadaEnforcement.code) {
      // Check if the code looks broken (contains description text - more than 20 chars)
      if (item.canadaEnforcement.code.length > 20) {
        // Reset the canadaEnforcement so merge can repopulate
        delete item.canadaEnforcement;
        fixedMatchCount++;
      }
    }
  }
}

// Update stats
for (const catKey of Object.keys(db.categories)) {
  const cat = db.categories[catKey];
  const items = cat.items;
  cat._stats.total = items.length;
  cat._stats.high_risk = items.filter(i => i.driverRiskCategory === 1).length;
  cat._stats.moderate_risk = items.filter(i => i.driverRiskCategory === 2).length;
  cat._stats.lower_risk = items.filter(i => i.driverRiskCategory === 3).length;
}

console.log(`\nTotal removed: ${removedCount} cvor_bulk_import entries`);
console.log(`Fixed: ${fixedMatchCount} matched items with broken canadaEnforcement codes`);

const newFileContent = prefix + JSON.stringify(db, null, 2) + suffix;
fs.writeFileSync(dbPath, newFileContent);
console.log('Cleaned violations.data.ts successfully!');
