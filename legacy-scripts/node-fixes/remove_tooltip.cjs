const fs = require('fs');
const file = 'src/pages/inspections/InspectionsPage.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/\s*<InfoTooltip\s+title=\"Specific Inspection Data\"\s+text=\"[^\"]+\"\s+\/>/g, '');

fs.writeFileSync(file, txt, 'utf8');
console.log('Replaced successfully');
