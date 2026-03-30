const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const LOWER_SENTINEL = ALPHABET[0];
const UPPER_SENTINEL = ALPHABET[ALPHABET.length - 1];
const MIDPOINT_CHAR = ALPHABET[Math.floor(ALPHABET.length / 2)];

/**
 * Generates a lexicographically ordered key between two existing keys.
 *
 * Keys are dense: if there is no room at the current character, the algorithm
 * recurses deeper and produces longer keys such as `am`, `ag`, `aam`, etc.
 */
export function generateKeyBetween(key1: string | null, key2: string | null): string {
  if (key1 !== null && key2 !== null && key1 >= key2) {
    throw new Error('key2 must be greater than key1.');
  }

  validateKey(key1);
  validateKey(key2);

  return generateBetween(key1 ?? '', key2 ?? '');
}

function validateKey(key: string | null) {
  if (!key) return;
  for (const char of key) {
    if (char < LOWER_SENTINEL || char > UPPER_SENTINEL) {
      throw new Error(`Unsupported sort key character: ${char}`);
    }
  }
}

function generateBetween(left: string, right: string): string {
  if (left === '' && right === '') {
    return MIDPOINT_CHAR;
  }

  let index = 0;
  while (
    index < left.length &&
    index < right.length &&
    left[index] === right[index]
  ) {
    index++;
  }

  const prefix = left.slice(0, index);
  const leftHasChar = index < left.length;
  const rightHasChar = index < right.length;

  const leftChar = leftHasChar ? left[index] : LOWER_SENTINEL;
  const rightChar = rightHasChar ? right[index] : UPPER_SENTINEL;

  if (leftChar === rightChar) {
    return prefix + leftChar + generateBetween(left.slice(index + 1), right.slice(index + 1));
  }

  const leftCode = leftChar.charCodeAt(0);
  const rightCode = rightChar.charCodeAt(0);

  if (rightCode - leftCode > 1) {
    const midCode = Math.floor((leftCode + rightCode) / 2);
    return prefix + String.fromCharCode(midCode);
  }

  if (leftHasChar) {
    return prefix + leftChar + generateBetween(left.slice(index + 1), '');
  }

  return prefix + leftChar + generateBetween('', right.slice(index + 1));
}
