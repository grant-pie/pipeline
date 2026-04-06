/**
 * utils/formatDate.ts — Date formatting utility.
 *
 * Converts an ISO date string into a human-readable "Mon D, YYYY" format
 * (e.g. "Mar 1, 2026") using the en-US locale. Plain YYYY-MM-DD strings are
 * parsed by constructing a local Date directly (bypassing the UTC midnight
 * interpretation that `new Date('2026-03-01')` would apply), ensuring the
 * displayed date always matches what the user entered.
 */

/**
 * Formats a date string for display in the UI.
 *
 * @param dateStr - An ISO date string. Accepts both 'YYYY-MM-DD' (parsed as
 *                  local time) and full ISO-8601 timestamps (parsed natively).
 * @returns A formatted string such as "Mar 1, 2026".
 */
export function formatDate(dateStr: string): string {
  // Parse plain YYYY-MM-DD without UTC offset to avoid off-by-one day issues.
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const date = ymdMatch
    ? new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]))
    : new Date(dateStr);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
