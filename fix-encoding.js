/**
 * Fix Mojibake in locale JSON files.
 * Replaces exact corrupted Unicode sequences with correct characters.
 * Run: node fix-encoding.js
 */
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');

// Map of corrupted sequences → correct character
// Corruption pattern: UTF-8 bytes of original char were each mis-decoded as Windows-1252 codepoints
const fixes = [
  // € (euro) - UTF-8: E2 82 AC → chars: U+00E2 U+201A U+00AC
  ['\u00e2\u201a\u00ac', '€'],

  // × (multiplication) - UTF-8: C3 97 → chars: U+00C3 U+2014 (â€")... check actual
  // × UTF-8: C3 97 → U+00C3 U+0097
  ['\u00c3\u0097', '×'],

  // – (en-dash) - UTF-8: E2 80 93 → U+00E2 U+20AC U+2014 ... need to check
  // E2=U+00E2, 80=U+20AC (€ in cp1252), 93=U+201C
  ['\u00e2\u20ac\u201c', '–'],   // en-dash

  // — (em-dash) - E2 80 94 → U+00E2 U+20AC U+201D
  ['\u00e2\u20ac\u201d', '—'],   // em-dash

  // ' (right single quote) - E2 80 99 → U+00E2 U+20AC U+2122
  ['\u00e2\u20ac\u2122', '\u2019'],

  // ' (left single quote) - E2 80 98 → U+00E2 U+20AC U+02DC
  ['\u00e2\u20ac\u02dc', '\u2018'],

  // " (left double quote) - E2 80 9C → U+00E2 U+20AC U+0153
  ['\u00e2\u20ac\u0153', '\u201c'],

  // " (right double quote) - E2 80 9D → U+00E2 U+20AC U+009D (or U+201D)
  ['\u00e2\u20ac\u009d', '\u201d'],

  // … (ellipsis) - E2 80 A6 → U+00E2 U+20AC U+00A6
  ['\u00e2\u20ac\u00a6', '…'],

  // German
  ['\u00c3\u00bc', 'ü'],   // ü (C3 BC)
  ['\u00c3\u00b6', 'ö'],   // ö (C3 B6)
  ['\u00c3\u00a4', 'ä'],   // ä (C3 A4)
  ['\u00c3\u0084', 'Ä'],   // Ä (C3 84)
  ['\u00c3\u0096', 'Ö'],   // Ö (C3 96)
  ['\u00c3\u009c', 'Ü'],   // Ü (C3 9C)
  ['\u00c3\u009f', 'ß'],   // ß (C3 9F)

  // French
  ['\u00c3\u00a9', 'é'],   ['\u00c3\u00a8', 'è'],
  ['\u00c3\u00aa', 'ê'],   ['\u00c3\u00a0', 'à'],
  ['\u00c3\u00ae', 'î'],   ['\u00c3\u00b4', 'ô'],
  ['\u00c3\u00bb', 'û'],   ['\u00c3\u00ab', 'ë'],
  ['\u00c3\u00af', 'ï'],   ['\u00c3\u00b9', 'ù'],
  ['\u00c3\u0089', 'É'],   ['\u00c3\u0087', 'Ç'],
  ['\u00c3\u0080', 'À'],

  // Spanish
  ['\u00c3\u00b1', 'ñ'],   ['\u00c3\u00b3', 'ó'],
  ['\u00c3\u00ad', 'í'],   ['\u00c3\u00a1', 'á'],
  ['\u00c3\u00ba', 'ú'],   ['\u00c3\u009a', 'Ú'],
  ['\u00c3\u008d', 'Í'],   ['\u00c3\u0093', 'Ó'],
  ['\u00c3\u0081', 'Á'],

  // Swedish/Nordic
  ['\u00c3\u00a5', 'å'],   ['\u00c3\u0085', 'Å'],
  ['\u00c3\u00b8', 'ø'],   ['\u00c3\u0098', 'Ø'],
  ['\u00c3\u00a6', 'æ'],   ['\u00c3\u0086', 'Æ'],
];

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
let totalFixes = 0;

files.forEach(filename => {
  const filepath = path.join(localesDir, filename);
  let content = fs.readFileSync(filepath, 'utf8');
  const original = content;
  let count = 0;

  for (const [bad, good] of fixes) {
    const before = content;
    content = content.split(bad).join(good);
    if (content !== before) count += (before.split(bad).length - 1);
  }

  if (content !== original) {
    // Validate JSON
    try { JSON.parse(content); } catch(e) {
      console.log(`✗ ${filename}: JSON invalid after fix, skipping`);
      return;
    }
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✓ ${filename}: fixed ${count} sequence(s)`);
    totalFixes += count;
  } else {
    console.log(`  ${filename}: clean`);
  }
});

console.log(`\nTotal: ${totalFixes} fixes`);
