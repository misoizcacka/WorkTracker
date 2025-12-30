// Using the alphabet 'a' through 'z' for simplicity.
const min = 'a'.charCodeAt(0);
const max = 'z'.charCodeAt(0);

/**
 * Generates a string key that sorts lexicographically between two other keys.
 * This is a common implementation of fractional indexing.
 * @param key1 The key before the new key (or null if inserting at the beginning).
 * @param key2 The key after the new key (or null if inserting at the end).
 * @returns A new key that sorts between key1 and key2.
 */
export function generateKeyBetween(key1: string | null, key2: string | null): string {
  if (key1 !== null && key2 !== null && key1 >= key2) {
    throw new Error('key2 must be greater than key1.');
  }

  // Handle null inputs, treating them as the boundaries of the alphabet.
  if (key1 === null || key1 === '') { // Added key1 === ''
    key1 = '';
  }
  if (key2 === null || key2 === '') { // Added key2 === ''
    key2 = '';
  }

  // If both keys are empty, it means we are inserting into an empty list.
  // Return a default midpoint character.
  if (key1 === '' && key2 === '') {
    return String.fromCharCode(Math.round((min + max) / 2)); // Returns 'm'
  }

  let i = 0;
  // Find the first differing character
  while (key1[i] === key2[i]) {
    i++;
  }

  const prefix = key1.slice(0, i);
  const char1 = i < key1.length ? key1.charCodeAt(i) : min - 1;
  const char2 = i < key2.length ? key2.charCodeAt(i) : max + 1;

  if (char1 + 1 === char2) {
    // The characters are adjacent (e.g., 'a' and 'b').
    // We need to go deeper by appending a character to key1.
    return key1 + generateKeyBetween(key1.slice(i + 1), null);
  }

  // The characters have a gap, so we can find a midpoint.
  const mid = Math.round((char1 + char2) / 2);
  return prefix + String.fromCharCode(mid);
}