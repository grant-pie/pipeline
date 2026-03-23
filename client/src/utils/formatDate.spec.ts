import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats a date string as Month Day, Year', () => {
    const result = formatDate('2026-03-18');
    expect(result).toBe('Mar 18, 2026');
  });

  it('handles different months correctly', () => {
    const result = formatDate('2026-12-01');
    expect(result).toBe('Dec 1, 2026');
  });
});
