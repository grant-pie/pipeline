export function formatDate(dateStr: string): string {
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
