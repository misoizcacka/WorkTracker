const fs = require('fs');
const c = fs.readFileSync('src/locales/fr.json', 'utf-8');

// Find all non-ASCII multi-char sequences still present
const matches = c.match(/[^\x00-\x7F]+/g);
const unique = [...new Set(matches)];
console.log('Unique non-ASCII sequences found:');
for (const s of unique) {
  const codepoints = [...s].map(ch => ch.codePointAt(0).toString(16).padStart(4,'0'));
  console.log(JSON.stringify(s), '->', codepoints.join(' '));
}
