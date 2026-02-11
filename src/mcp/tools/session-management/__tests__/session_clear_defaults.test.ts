import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionStore } from '../../../../utils/session-store.ts';
import { schema, handler, sessionClearDefaultsLogic } from '../session_clear_defaults.ts';

describe('session-clear-defaults tool', () => {
  beforeEach(() => {
    sessionStore.clear();
    sessionStore.setDefaults({
      scheme: 'MyScheme',
      projectPath: '/path/to/proj.xcodeproj',
      simulatorName: 'iPhone 16',
      deviceId: 'DEVICE-123',
      useLatestOS: true,
      arch: 'arm64',
      derivedDataPath: '/tmp/derived-data',
    });
  });

  afterEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation', () => {
    it('should have handler function', () => {
      expect(typeof handler).toBe('function');
    });

    it('should have schema object', () => {
      expect(schema).toBeDefined();
      expect(typeof schema).toBe('object');
    });
  });

  describe('Handler Behavior', () => {
    it('should clear specific keys when provided', async () => {
      const result = await sessionClearDefaultsLogic({
        keys: ['scheme', 'deviceId', 'derivedDataPath'],
      });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Session defaults cleared');

      const current = sessionStore.getAll();
      expect(current.scheme).toBeUndefined();
      expect(current.deviceId).toBeUndefined();
      expect(current.derivedDataPath).toBeUndefined();
      expect(current.projectPath).toBe('/path/to/proj.xcodeproj');
      expect(current.simulatorName).toBe('iPhone 16');
      expect(current.useLatestOS).toBe(true);
      expect(current.arch).toBe('arm64');
    });

    it('should clear all when all=true', async () => {
      sessionStore.setActiveProfile('ios');
      sessionStore.setDefaults({ scheme: 'IOS' });
      sessionStore.setActiveProfile(null);
      const result = await sessionClearDefaultsLogic({ all: true });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('Session defaults cleared');

      const current = sessionStore.getAll();
      expect(Object.keys(current).length).toBe(0);
      expect(sessionStore.listProfiles()).toEqual([]);
      expect(sessionStore.getActiveProfile()).toBeNull();
    });

    it('should clear all when no params provided', async () => {
      const result = await sessionClearDefaultsLogic({});
      expect(result.isError).toBe(false);
      const current = sessionStore.getAll();
      expect(Object.keys(current).length).toBe(0);
    });

    it('should validate keys enum', async () => {
      const result = (await handler({ keys: ['invalid' as any] })) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('keys');
    });
  });
});
