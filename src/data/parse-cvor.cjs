/**
 * CVOR Raw Data Parser
 * Parses raw-cvor.txt into structured JSON with proper code/description separation.
 *
 * Format of each data line:
 *   [OffenceCode] DESCRIPTION CVOR_PTS CCMTA_CODE SFTY_CDE CON_TYPE ALT_GRP [SPD/WT] C/D/B
 *
 * Where OffenceCode = ActPrefix Section [Subsection(s)] [LetterSuffix(es)]
 *   e.g. "530 5555 1", "HTA 107 8 A", "CCC 249.1 1", "530 6124 1 D I"
 *
 * Trailing fields (parsed right-to-left):
 *   C/D/B     = B or C
 *   SPD/WT    = SPD, WT1, WT2 (optional)
 *   Alt Grp   = 2-digit number (01-04)
 *   Con Type  = 2-digit number (01-11)
 *   Sfty Cde  = S or A (safety or administrative)
 *   CCMTA     = 4-digit code
 *   CVOR Pts  = 0-5 (single digit)
 *
 * Code vs Description separation:
 *   Code tokens are: numbers (incl. decimals like 4.13), single letters (A-J),
 *   and letter+roman combos (AII, DI, DII, etc.)
 *   Description starts at the first multi-character alphabetic word.
 */

const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, 'raw-cvor.txt');
const outPath = path.join(__dirname, 'parsed-cvor.json');

const raw = fs.readFileSync(rawPath, 'utf8');
const lines = raw.split('\n');

// Known act prefixes (alpha ones appear literally, numeric ones are just numbers)
const ALPHA_ACTS = ['CCC', 'HTA', 'LLA'];

// Act code to statute name mapping
const ACT_MAP = {
  '229': 'Traffic Act',
  '247': 'Airport Traffic Act',
  '284': 'National Capitale',
  '508': 'CAIA',
  '513': 'TDG',
  '519': 'EPA',
  '523': 'FTA',
  '530': 'HTA/Reg',
  '573': 'PVA',
  '597': 'TDG-Fed',
  '834': 'Federal',
  '982': 'PVA-Reg',
  'CCC': 'CCC',
  'HTA': 'HTA',
  'LLA': 'LLA'
};

/**
 * Check if a token is a "code token" (part of the offence code, not description)
 * Code tokens: numbers, decimal numbers, single letters A-Z,
 * letter+roman combos like AII, DI, or continuation decimals like .1
 */
function isCodeToken(token) {
  // Pure number: 530, 5555, 1, 3, 34023, etc.
  if (/^\d+$/.test(token)) return true;
  // Decimal number: 4.13, 13.1, 249.1, 1.1, etc.
  if (/^\d+\.\d+$/.test(token)) return true;
  // Continuation decimal: .1, .2
  if (/^\.\d+$/.test(token)) return true;
  // Single uppercase letter: A, B, C, D, E, F, G, H, I, J
  if (/^[A-Z]$/.test(token)) return true;
  // Letter + roman numeral: AII, DI, DII, AI, BI, CI, AII, etc.
  if (/^[A-Z]I{1,3}$/.test(token)) return true;
  // CII, DIII patterns
  if (/^[A-Z]{1}I{1,3}$/.test(token)) return true;
  return false;
}

/**
 * Check if a line is a data line (not a header or blank)
 */
function isDataLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Skip header keywords
  const headerWords = ['Offence', 'Code', 'Description', 'Points', 'CCMTA', 'Sfty', 'Cde',
    'Con', 'Type', 'Alt', 'Grp', 'SPD/', 'WT', 'Carrier', 'Driver', 'C/D/B',
    'CdeOffence', 'Long', 'Text', 'English', 'CVOR'];
  if (headerWords.includes(trimmed)) return false;
  // Must start with a known act prefix or a number
  const firstToken = trimmed.split(/\s+/)[0];
  if (ALPHA_ACTS.includes(firstToken)) return true;
  if (/^\d+$/.test(firstToken)) return true;
  return false;
}

/**
 * Parse a single data line into structured fields
 */
function parseLine(line) {
  // Normalize whitespace (some descriptions have multiple spaces)
  const normalized = line.trim().replace(/\s+/g, ' ');
  const tokens = normalized.split(' ');

  if (tokens.length < 7) return null; // Too short to be valid

  // === Parse trailing fields from right ===
  let idx = tokens.length - 1;

  // C/D/B: last token, should be B or C
  const cdb = tokens[idx--];
  if (!['B', 'C', 'D'].includes(cdb)) return null;

  // SPD/WT: optional, check next token
  let spd_wt = '';
  if (['SPD', 'WT1', 'WT2'].includes(tokens[idx])) {
    spd_wt = tokens[idx--];
  }

  // Alt Grp: 2-digit
  let alt = tokens[idx--];
  // Con Type: 2-digit
  let con = tokens[idx--];
  // Sfty Cde: S or A (occasionally a digit due to source typo)
  let sfty = tokens[idx--];
  // CCMTA Code: 4-digit
  let ccmta = tokens[idx--];
  // CVOR Points: single digit 0-5
  let pointsStr = tokens[idx--];
  let points = parseInt(pointsStr, 10);

  // Fallback: if points didn't parse, the line may be missing a field (e.g. missing Alt Grp)
  // Try shifting: assume alt was actually con, con was sfty, etc.
  if (isNaN(points) && /^\d{4}$/.test(sfty)) {
    // The fields shifted because Alt Grp was missing
    points = parseInt(ccmta, 10);
    ccmta = sfty;
    sfty = con;
    con = alt;
    alt = '01'; // default
    idx++; // give back one token
  }

  if (isNaN(points) || idx < 1) return null;

  // Remaining tokens [0..idx] = code + description
  const remaining = tokens.slice(0, idx + 1);

  // === Determine act prefix ===
  let actPrefix;
  let startIdx = 0; // Index in remaining where code tokens start

  if (ALPHA_ACTS.includes(remaining[0])) {
    actPrefix = remaining[0];
    startIdx = 1;
  } else if (/^\d+$/.test(remaining[0])) {
    actPrefix = remaining[0];
    startIdx = 1;
  } else {
    return null;
  }

  // === Separate code from description ===
  // Scan tokens after act prefix: code tokens are numbers, decimals, single letters
  // Description starts at first multi-character alphabetic word
  let codeEndIdx = startIdx - 1; // Index of last code token (inclusive)

  for (let i = startIdx; i < remaining.length; i++) {
    if (isCodeToken(remaining[i])) {
      codeEndIdx = i;
    } else {
      // This token is part of description
      break;
    }
  }

  const codeTokens = remaining.slice(0, codeEndIdx + 1);
  const descTokens = remaining.slice(codeEndIdx + 1);

  const code = codeTokens.join(' ');
  const desc = descTokens.join(' ');

  // Determine act name
  const act = ACT_MAP[actPrefix] || 'CVOR';

  return {
    code,
    desc,
    points,
    ccmta,
    sfty,
    con,
    alt,
    spd_wt,
    cdb,
    act,
    originalLine: line.trim()
  };
}

// === Main parsing ===
const results = [];
let skipped = 0;
let parsed = 0;

for (const line of lines) {
  if (!isDataLine(line)) continue;

  const result = parseLine(line);
  if (result) {
    results.push(result);
    parsed++;
  } else {
    skipped++;
    console.warn('SKIPPED:', line.trim());
  }
}

// Write output
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

console.log(`\nParsed: ${parsed} entries`);
console.log(`Skipped: ${skipped} lines`);
console.log(`Output: ${outPath}`);

// Print some samples to verify
console.log('\n=== Sample entries ===');
const samples = [
  results.find(r => r.originalLine.includes('530 5555 1 EXCEED')),
  results.find(r => r.originalLine.includes('508 2 1 A OPERATE')),
  results.find(r => r.originalLine.includes('530 6124 1 D I SCHOOL')),
  results.find(r => r.originalLine.includes('HTA 62 14.1')),
  results.find(r => r.originalLine.includes('CCC 249 1 DANGEROUS')),
  results.find(r => r.originalLine.includes('530 3405 1 3 CLASS')),
  results.find(r => r.originalLine.includes('HTA 128 1 A 2')),
].filter(Boolean);

for (const s of samples) {
  console.log(`  Code: "${s.code}" | Desc: "${s.desc}" | Pts: ${s.points} | Act: ${s.act}`);
}
