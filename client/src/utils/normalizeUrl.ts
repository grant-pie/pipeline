/**
 * utils/normalizeUrl.ts — URL normalisation utility.
 *
 * Ensures a URL string always has a protocol prefix so it can be used safely
 * as an anchor href. When the user types "example.com" the browser would
 * otherwise interpret a bare href as a relative path; prepending "https://"
 * makes it absolute.
 */

/**
 * Ensures the given URL string begins with a protocol (http:// or https://).
 * Strings that already have a protocol are returned unchanged. Empty or
 * whitespace-only strings are returned as an empty string.
 *
 * @param url - The raw URL string entered by the user.
 * @returns The normalised URL string with a protocol prefix, or '' if empty.
 *
 * @example
 * normalizeUrl('example.com')        // → 'https://example.com'
 * normalizeUrl('https://example.com') // → 'https://example.com'
 * normalizeUrl('http://example.com')  // → 'http://example.com'
 * normalizeUrl('  ')                  // → ''
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
