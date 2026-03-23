import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './normalizeUrl';

describe('normalizeUrl', () => {
  it('prepends https:// when no protocol is present', () => {
    expect(normalizeUrl('google.com')).toBe('https://google.com');
  });

  it('leaves https:// URLs unchanged', () => {
    expect(normalizeUrl('https://google.com')).toBe('https://google.com');
  });

  it('leaves http:// URLs unchanged', () => {
    expect(normalizeUrl('http://google.com')).toBe('http://google.com');
  });

  it('returns empty string when input is empty', () => {
    expect(normalizeUrl('')).toBe('');
  });

  it('trims whitespace before normalizing', () => {
    expect(normalizeUrl('  google.com  ')).toBe('https://google.com');
  });

  it('handles subdomains correctly', () => {
    expect(normalizeUrl('careers.acme.com/jobs/123')).toBe('https://careers.acme.com/jobs/123');
  });
});
