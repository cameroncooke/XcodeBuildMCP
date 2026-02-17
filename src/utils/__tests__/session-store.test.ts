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

  it('isolates defaults by active profile', () => {
    sessionStore.setDefaults({ scheme: 'GlobalApp' });
    sessionStore.setActiveProfile('ios');
    sessionStore.setDefaults({ scheme: 'iOSApp', simulatorName: 'iPhone 16' });
    sessionStore.setActiveProfile('watch');
    sessionStore.setDefaults({ scheme: 'WatchApp' });

    sessionStore.setActiveProfile('ios');
    expect(sessionStore.getAll()).toMatchObject({ scheme: 'iOSApp', simulatorName: 'iPhone 16' });

    sessionStore.setActiveProfile('watch');
    expect(sessionStore.getAll()).toMatchObject({ scheme: 'WatchApp' });
    expect(sessionStore.getAll().simulatorName).toBeUndefined();

    sessionStore.setActiveProfile(null);
    expect(sessionStore.getAll()).toMatchObject({ scheme: 'GlobalApp' });
  });

  it('does not inherit global project/workspace defaults into named profiles', () => {
    sessionStore.setDefaults({ workspacePath: '/repo/MyApp.xcworkspace' });

    sessionStore.setActiveProfile('ios');
    sessionStore.setDefaults({ scheme: 'iOSApp' });

    expect(sessionStore.getAll().workspacePath).toBeUndefined();
    expect(sessionStore.getAll()).toMatchObject({ scheme: 'iOSApp' });

    sessionStore.setActiveProfile(null);
    expect(sessionStore.getAll()).toMatchObject({ workspacePath: '/repo/MyApp.xcworkspace' });
  });

  it('clear(keys) only affects active profile while clear() clears all profiles', () => {
    sessionStore.setActiveProfile('ios');
    sessionStore.setDefaults({ scheme: 'iOSApp', simulatorId: 'SIM-1' });
    sessionStore.setActiveProfile('watch');
    sessionStore.setDefaults({ scheme: 'WatchApp', simulatorId: 'SIM-2' });

    sessionStore.setActiveProfile('ios');
    sessionStore.clear(['simulatorId']);
    expect(sessionStore.getAll().scheme).toBe('iOSApp');
    expect(sessionStore.getAll().simulatorId).toBeUndefined();

    sessionStore.setActiveProfile('watch');
    expect(sessionStore.getAll().simulatorId).toBe('SIM-2');

    sessionStore.clear();
    expect(sessionStore.getAll()).toEqual({});
    expect(sessionStore.getActiveProfile()).toBeNull();
    expect(sessionStore.listProfiles()).toEqual([]);
  });
});
