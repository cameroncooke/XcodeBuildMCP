import { describe, it, expect } from 'vitest';
import { normalizeSimctlChildEnv } from '../environment.ts';

describe('normalizeSimctlChildEnv', () => {
  it('should prefix unprefixed keys with SIMCTL_CHILD_', () => {
    const result = normalizeSimctlChildEnv({ FOO: '1', BAR: '2' });
    expect(result).toEqual({ SIMCTL_CHILD_FOO: '1', SIMCTL_CHILD_BAR: '2' });
  });

  it('should preserve already-prefixed keys', () => {
    const result = normalizeSimctlChildEnv({ SIMCTL_CHILD_FOO: '1' });
    expect(result).toEqual({ SIMCTL_CHILD_FOO: '1' });
  });

  it('should handle a mix of prefixed and unprefixed keys', () => {
    const result = normalizeSimctlChildEnv({ FOO: '1', SIMCTL_CHILD_BAR: '2' });
    expect(result).toEqual({ SIMCTL_CHILD_FOO: '1', SIMCTL_CHILD_BAR: '2' });
  });

  it('should filter null and undefined values', () => {
    const input = { FOO: '1', BAR: null, BAZ: undefined } as unknown as Record<string, string>;
    const result = normalizeSimctlChildEnv(input);
    expect(result).toEqual({ SIMCTL_CHILD_FOO: '1' });
  });

  it('should return empty object for empty input', () => {
    expect(normalizeSimctlChildEnv({})).toEqual({});
  });

  it('should return empty object for null/undefined input', () => {
    expect(normalizeSimctlChildEnv(null as unknown as Record<string, string>)).toEqual({});
    expect(normalizeSimctlChildEnv(undefined as unknown as Record<string, string>)).toEqual({});
  });
});
