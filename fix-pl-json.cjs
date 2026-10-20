const fs = require('fs');
const path = require('path');

// Windows-1252 special chars in the 0x80-0x9F range that map to Unicode differently
// These are the chars that differ from Latin-1 (ISO-8859-1)
const win1252extras = {
  0x80: 0x20AC, // € (euro sign)
  0x82: 0x201A,
  0x83: 0x0192,
  0x84: 0x201E,
  0x85: 0x2026, // …
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02C6,
  0x89: 0x2030,
  0x8A: 0x0160,
  0x8B: 0x2039,
  0x8C: 0x0152,
  0x8E: 0x017D,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201C,
  0x94: 0x201D,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02DC,
  0x99: 0x2122, // ™
  0x9A: 0x0161,
  0x9B: 0x203A,
  0x9C: 0x0153,
  0x9E: 0x017E,
  0x9F: 0x0178,
};

// Build reverse map: unicode codepoint -> original Windows-1252 byte
const reverseMap = {};
for (const [byteStr, cp] of Object.entries(win1252extras)) {
  reverseMap[cp] = parseInt(byteStr);
}

const filePath = path.join(__dirname, 'src', 'locales', 'pl.json');
const buf = fs.readFileSync(filePath);
const content = buf.toString('utf8');

// Convert each unicode char back to its original Windows-1252 byte
const originalBytes = [];
let i = 0;
while (i < content.length) {
  const cp = content.codePointAt(i);
  i += (cp > 0xFFFF) ? 2 : 1;

  if (cp < 0x80) {
    // ASCII - unchanged
    originalBytes.push(cp);
  } else if (reverseMap[cp] !== undefined) {
    // Special Windows-1252 char
    originalBytes.push(reverseMap[cp]);
  } else if (cp <= 0xFF) {
    // Latin-1 range (same in win1252 for 0xA0-0xFF)
    originalBytes.push(cp);
  } else {
    // Shouldn't happen in valid mojibake, flag it
    process.stderr.write('Unexpected codepoint: U+' + cp.toString(16).toUpperCase() + '\n');
    originalBytes.push(0x3F); // '?'
  }
}

// Now originalBytes should be the original UTF-8 bytes
const restored = Buffer.from(originalBytes).toString('utf8');

// Verify Polish chars are present
const hasDiacritics = restored.includes('\u0105') || restored.includes('\u0119') || restored.includes('\u015B');
if (!hasDiacritics) {
  process.stderr.write('ERROR: Restored content does not contain Polish diacritics!\n');
  process.exit(1);
}

// Validate JSON
try {
  JSON.parse(restored);
} catch (e) {
  process.stderr.write('ERROR: Restored content is not valid JSON: ' + e.message + '\n');
  process.exit(1);
}

fs.writeFileSync(filePath, restored, 'utf8');
console.log('Success! Polish characters restored.');
console.log('Sample from fixed file:');
console.log(restored.substring(40, 300));
