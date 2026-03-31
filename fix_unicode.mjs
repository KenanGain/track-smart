import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filePath = path.join(__dirname, 'src', 'pages', 'inspections', 'InspectionsPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Count occurrences before
const countBefore = (content.match(/\\u00b7/g) || []).length + 
                    (content.match(/\\u2265/g) || []).length + 
                    (content.match(/\\u2014/g) || []).length;
console.log(`Found ${countBefore} escaped unicode sequences to fix`);

// Replace double-escaped unicode with actual characters
content = content.replace(/\\u00b7/g, '\u00b7');  // middle dot ·
content = content.replace(/\\u2265/g, '\u2265');  // ≥
content = content.replace(/\\u2014/g, '\u2014');  // em dash —

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done! Unicode characters fixed.');
