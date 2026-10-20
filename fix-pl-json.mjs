import { readFileSync, writeFileSync } from 'fs';

// The file was UTF-8 encoded but was read/saved as if Latin-1,
// creating mojibake. Fix by re-interpreting the UTF-8 bytes as Latin-1
// and then decoding them as UTF-8.

const filePath = new URL('./src/locales/pl.json', import.meta.url).pathname.replace(/^\//, '');

// Read raw bytes
const rawBuffer = readFileSync(filePath);

// The content is valid UTF-8, but every Polish character is a double-encoded sequence.
// Strategy: encode to Latin-1 (each char code < 256 → byte), then decode as UTF-8.
const content = rawBuffer.toString('utf8');

// Encode as latin1 to get the original bytes, then decode as utf-8
const fixed = Buffer.from(content, 'latin1').toString('utf8');

// Verify we actually fixed things (spot check)
if (!fixed.includes('ą') && !fixed.includes('ę') && !fixed.includes('ś')) {
  console.error('Fix did not produce expected Polish characters!');
  process.exit(1);
}

writeFileSync(filePath, fixed, 'utf8');
console.log('Fixed! First 300 chars:');
console.log(fixed.substring(0, 300));
