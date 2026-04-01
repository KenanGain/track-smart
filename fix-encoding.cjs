const fs = require('fs');

const files = [
  'src/pages/inspections/NscNsPerformanceCard.tsx',
  'src/pages/inspections/NscPeiPerformanceCard.tsx',
  'src/pages/inspections/InspectionsPage.tsx',
];

function fix(txt) {
  // Read as latin1, replace the corrupted multi-byte sequences with clean ASCII/UTF-8
  // Â· (C2 B7) = middle dot -> ' · '
  txt = txt.split('\xC2\xB7').join(' \xB7 ');
  // â‰¥ (E2 89 A5) = >=
  txt = txt.split('\xE2\x89\xA5').join('>=');
  // â‰¤ (E2 89 A4) = <=
  txt = txt.split('\xE2\x89\xA4').join('<=');
  // â€" (E2 80 93) = en dash -> -
  txt = txt.split('\xE2\x80\x93').join('-');
  // â€" (E2 80 94) = em dash -> -
  txt = txt.split('\xE2\x80\x94').join('-');
  // â€¦ (E2 80 A6) = ellipsis -> ...
  txt = txt.split('\xE2\x80\xA6').join('...');
  // â†' (E2 86 92) = arrow -> ->
  txt = txt.split('\xE2\x86\x92').join('->');
  // â"€ (E2 94 80) = box drawing horizontal -> -
  txt = txt.split('\xE2\x94\x80').join('-');
  // â€™ (E2 80 99) = right single quote -> '
  txt = txt.split('\xE2\x80\x99').join("'");
  // â€œ (E2 80 9C) = left double quote -> "
  txt = txt.split('\xE2\x80\x9C').join('"');
  // â€ (E2 80 9D) = right double quote -> "
  txt = txt.split('\xE2\x80\x9D').join('"');
  return txt;
}

for (const f of files) {
  const txt = fs.readFileSync(f, 'binary');
  const fixed = fix(txt);
  fs.writeFileSync(f, fixed, 'binary');
  const remaining = (fixed.match(/[\xC2-\xEF][\x80-\xBF]/g) || []).length;
  console.log('fixed', f, '- remaining multi-byte pairs:', remaining);
}
