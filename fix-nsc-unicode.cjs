const fs = require('fs');

const B7  = '\u00B7';  // middle dot ·
const UP  = '\u25B4';  // ▴
const DN  = '\u25BE';  // ▾
const ARR = '\u2192';  // →

const MIDDOT_HTML  = '&middot;';
const UP_HTML      = '&#x25B4;';
const DN_HTML      = '&#x25BE;';
const ARR_HTML     = '&#x2192;';

function fixFile(fname) {
  let lines = fs.readFileSync(fname, 'utf8').split('\n');

  lines = lines.map((l) => {
    // -------------------------------------------------------------------
    // Inside backtick template literals: replace literal chars AND HTML entities
    // with \u escapes so JS evaluates them correctly at runtime
    // -------------------------------------------------------------------
    l = l.replace(/`([^`\n]*)`/g, (m, inner) => {
      inner = inner.split(B7).join('\\u00B7');
      inner = inner.split(UP).join('\\u25B4');
      inner = inner.split(DN).join('\\u25BE');
      inner = inner.split(ARR).join('\\u2192');
      inner = inner.split(MIDDOT_HTML).join('\\u00B7');
      inner = inner.split(UP_HTML).join('\\u25B4');
      inner = inner.split(DN_HTML).join('\\u25BE');
      inner = inner.split(ARR_HTML).join('\\u2192');
      return '`' + inner + '`';
    });

    // -------------------------------------------------------------------
    // Inside single-quoted JS string literals: same treatment
    // -------------------------------------------------------------------
    l = l.replace(/'([^'\n]*)'/g, (m, inner) => {
      inner = inner.split(B7).join('\\u00B7');
      inner = inner.split(UP).join('\\u25B4');
      inner = inner.split(DN).join('\\u25BE');
      inner = inner.split(ARR).join('\\u2192');
      inner = inner.split(MIDDOT_HTML).join('\\u00B7');
      inner = inner.split(UP_HTML).join('\\u25B4');
      inner = inner.split(DN_HTML).join('\\u25BE');
      inner = inner.split(ARR_HTML).join('\\u2192');
      return "'" + inner + "'";
    });

    // -------------------------------------------------------------------
    // Remaining literal chars outside quotes = JSX text content.
    // HTML entities work here — React renders them correctly.
    // -------------------------------------------------------------------
    l = l.split(B7).join(MIDDOT_HTML);
    l = l.split(UP).join(UP_HTML);
    l = l.split(DN).join(DN_HTML);
    l = l.split(ARR).join(ARR_HTML);

    return l;
  });

  fs.writeFileSync(fname, lines.join('\n'), 'utf8');

  // Verify
  const after = fs.readFileSync(fname, 'utf8');
  const stillLiteral = [B7, UP, DN, ARR].some(c => after.split('\n').some((ln, i) => {
    const t = ln.trimStart();
    if (t.startsWith('//') || (t.startsWith('{/*') && t.endsWith('*/}'))) return false;
    return ln.includes(c);
  }));
  console.log(fname.split('/').pop() + (stillLiteral ? ' ⚠ still has literals' : ' ✓ CLEAN'));
}

fixFile('src/pages/inspections/NscNsPerformanceCard.tsx');
fixFile('src/pages/inspections/NscPeiPerformanceCard.tsx');
