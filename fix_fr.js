const fs = require('fs');

let content = fs.readFileSync('src/locales/fr.json', 'utf-8');

// Mojibake: UTF-8 multi-byte sequences misread as latin-1 characters then stored as UTF-8
// Each entry: [corrupted_sequence, correct_character]
const replacements = [
  ['\u00c3\u00a9', '\u00e9'],  // é  e acute
  ['\u00c3\u00a8', '\u00e8'],  // è  e grave
  ['\u00c3\u00aa', '\u00ea'],  // ê  e circumflex
  ['\u00c3\u00ab', '\u00eb'],  // ë  e diaeresis
  ['\u00c3\u00a0', '\u00e0'],  // à  a grave
  ['\u00c3\u00a2', '\u00e2'],  // â  a circumflex
  ['\u00c3\u00a4', '\u00e4'],  // ä  a diaeresis
  ['\u00c3\u00a6', '\u00e6'],  // æ  ae ligature
  ['\u00c3\u00a7', '\u00e7'],  // ç  c cedilla
  ['\u00c3\u00a8', '\u00e8'],  // è  e grave (dup)
  ['\u00c3\u00ae', '\u00ee'],  // î  i circumflex
  ['\u00c3\u00af', '\u00ef'],  // ï  i diaeresis
  ['\u00c3\u00b4', '\u00f4'],  // ô  o circumflex
  ['\u00c3\u00b6', '\u00f6'],  // ö  o diaeresis
  ['\u00c3\u00b9', '\u00f9'],  // ù  u grave
  ['\u00c3\u00bb', '\u00fb'],  // û  u circumflex
  ['\u00c3\u00bc', '\u00fc'],  // ü  u diaeresis
  ['\u00c3\u00bf', '\u00ff'],  // ÿ  y diaeresis
  // Capital accented letters
  ['\u00c3\u0089', '\u00c9'],  // É  E acute capital
  ['\u00c3\u0088', '\u00c8'],  // È  E grave capital
  ['\u00c3\u008a', '\u00ca'],  // Ê  E circumflex capital
  ['\u00c3\u0080', '\u00c0'],  // À  A grave capital
  ['\u00c3\u0082', '\u00c2'],  // Â  A circumflex capital
  ['\u00c3\u0086', '\u00c6'],  // Æ  AE capital
  ['\u00c3\u0087', '\u00c7'],  // Ç  C cedilla capital
  ['\u00c3\u008e', '\u00ce'],  // Î  I circumflex capital
  ['\u00c3\u0094', '\u00d4'],  // Ô  O circumflex capital
  ['\u00c3\u009b', '\u00db'],  // Û  U circumflex capital
  ['\u00c3\u009c', '\u00dc'],  // Ü  U diaeresis capital
  // Special punctuation (3-byte UTF-8 misread as 3 latin-1 chars)
  ['\u00e2\u0082\u00ac', '\u20ac'],  // €  euro sign
  ['\u00e2\u0080\u0093', '\u2013'],  // –  en dash
  ['\u00e2\u0080\u0094', '\u2014'],  // —  em dash
  ['\u00e2\u0080\u0099', '\u2019'],  // '  right single quote
  ['\u00e2\u0080\u009c', '\u201c'],  // "  left double quote
  ['\u00e2\u0080\u009d', '\u201d'],  // "  right double quote
  ['\u00e2\u0080\u00a6', '\u2026'],  // …  ellipsis
  // Remaining Ã cases (bare Ã followed by non-accented char)
  ['\u00c3\u00a3', '\u00e3'],  // ã
  ['\u00c3\u00b5', '\u00f5'],  // õ
  // Non-breaking space and other latin supplements
  ['\u00c2\u00a0', '\u00a0'],  // non-breaking space
  ['\u00c2\u00ab', '\u00ab'],  // «
  ['\u00c2\u00bb', '\u00bb'],  // »
  ['\u00c2\u00a9', '\u00a9'],  // ©
  ['\u00c2\u00ae', '\u00ae'],  // ®
  ['\u00c2\u00b0', '\u00b0'],  // °
  ['\u00c3\u0097', '\u00d7'],  // ×
  ['\u00c3\u00b3', '\u00f3'],  // ó
  ['\u00c3\u00ba', '\u00fa'],  // ú
  ['\u00c3\u00ad', '\u00ed'],  // í
  ['\u00c3\u00b1', '\u00f1'],  // ñ
  // Catch remaining Ã sequences that appear in the text
  ['\u00c3\u00a5', '\u00e5'],  // å
];

// Apply replacements
for (const [from, to] of replacements) {
  content = content.split(from).join(to);
}

// Parse to validate JSON
const data = JSON.parse(content);
console.log('JSON valid: true');

// Write back
fs.writeFileSync('src/locales/fr.json', content, 'utf-8');
console.log('File written successfully');

// Spot checks
console.log('allRightsReserved:', data.common.allRightsReserved);
console.log('authRequiredMessage:', data.errors.authRequiredMessage);
console.log('signUpButton:', data.login.signUpButton);
console.log('currency:', data.common.currency);
console.log('ctaTitle:', data.guest.index.ctaTitle);
console.log('failedToFinalizeSetup:', data.signup.failedToFinalizeSetup);
console.log('checkIn:', data.worker.home.checkIn);
console.log('faq1A excerpt:', data.pricing.faq1A.substring(0, 80));
console.log('reassuranceTitle:', data.signup.reassuranceTitle);
