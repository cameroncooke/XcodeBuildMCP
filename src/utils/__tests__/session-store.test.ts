import { describe, it, expect, beforeEach } from 'vitest';
import { sessionStore } from '../session-store.ts';

describe('SessionStore', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  it('should set and get defaults', () => {
    sessionStore.setDefaults({ scheme: 'App', useLatestOS: true });
    expect(sessionStore.get('scheme')).toBe('App');
    expect(sessionStore.get('useLatestOS')).toBe(true);
  });

  it('should merge defaults on set', () => {
    sessionStore.setDefaults({ scheme: 'App' });
    sessionStore.setDefaults({ simulatorName: 'iPhone 16' });
    const all = sessionStore.getAll();
    expect(all.scheme).toBe('App');
    expect(all.simulatorName).toBe('iPhone 16');
  });

  it('should clear specific keys', () => {
    sessionStore.setDefaults({ scheme: 'App', simulatorId: 'SIM-1', deviceId: 'DEV-1' });
    sessionStore.clear(['simulatorId']);
    const all = sessionStore.getAll();
    expect(all.scheme).toBe('App');
    expect(all.simulatorId).toBeUndefined();
    expect(all.deviceId).toBe('DEV-1');
  });

  it('should clear all when no keys provided', () => {
    sessionStore.setDefaults({ scheme: 'App', simulatorId: 'SIM-1' });
    sessionStore.clear();
    const all = sessionStore.getAll();
    expect(Object.keys(all).length).toBe(0);
  });

  it('should be a no-op when empty keys array provided', () => {
    sessionStore.setDefaults({ scheme: 'App', simulatorId: 'SIM-1' });
    sessionStore.clear([]);
    const all = sessionStore.getAll();
    expect(all.scheme).toBe('App');
    expect(all.simulatorId).toBe('SIM-1');
  });

  it('getAll returns a detached copy of env so mutations do not affect stored defaults', () => {
    sessionStore.setDefaults({ env: { API_KEY: 'secret' } });

    const copy = sessionStore.getAll();
    copy.env!.API_KEY = 'tampered';
    copy.env!.EXTRA = 'injected';

    const stored = sessionStore.getAll();
    expect(stored.env).toEqual({ API_KEY: 'secret' });
  });
});
