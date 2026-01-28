import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionStore } from '../../../../utils/session-store.ts';
import plugin, { sessionClearDefaultsLogic } from '../session_clear_defaults.ts';

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

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('session-clear-defaults');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe('Clear session defaults.');
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should have schema object', () => {
      expect(plugin.schema).toBeDefined();
      expect(typeof plugin.schema).toBe('object');
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
      const result = await sessionClearDefaultsLogic({ all: true });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('Session defaults cleared');

      const current = sessionStore.getAll();
      expect(Object.keys(current).length).toBe(0);
    });

    it('should clear all when no params provided', async () => {
      const result = await sessionClearDefaultsLogic({});
      expect(result.isError).toBe(false);
      const current = sessionStore.getAll();
      expect(Object.keys(current).length).toBe(0);
    });

    it('should validate keys enum', async () => {
      const result = (await plugin.handler({ keys: ['invalid' as any] })) as any;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('keys');
    });
  });
});
