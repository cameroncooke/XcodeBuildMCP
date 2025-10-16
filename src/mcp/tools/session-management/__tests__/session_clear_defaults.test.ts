import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sessionStore } from '../../../../utils/session-store.ts';
import plugin, { sessionClearDefaultsLogic } from '../session_clear_defaults.ts';

describe('session-clear-defaults tool', () => {
  let tempDir: string;
  let testProjectPath: string;

  beforeEach(() => {
    sessionStore.clear();
    // Create a temporary directory and test file
    tempDir = mkdtempSync(join(tmpdir(), 'session-clear-defaults-test-'));
    testProjectPath = join(tempDir, 'proj.xcodeproj');
    writeFileSync(testProjectPath, 'test content');

    sessionStore.setDefaults({
      scheme: 'MyScheme',
      projectPath: testProjectPath,
      simulatorName: 'iPhone 16',
      deviceId: 'DEVICE-123',
      useLatestOS: true,
      arch: 'arm64',
    });
  });

  afterEach(() => {
    sessionStore.clear();
    // Clean up temporary directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('session-clear-defaults');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe('Clear selected or all session defaults.');
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
      const result = await sessionClearDefaultsLogic({ keys: ['scheme', 'deviceId'] });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Session defaults cleared');

      const current = sessionStore.getAll();
      expect(current.scheme).toBeUndefined();
      expect(current.deviceId).toBeUndefined();
      expect(current.projectPath).toBe(testProjectPath);
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
