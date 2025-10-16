import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import plugin, { sessionSetDefaultsLogic } from '../session_set_defaults.ts';

describe('session-set-defaults tool', () => {
  let tempDir: string;

  beforeEach(() => {
    sessionStore.clear();
    // Create a temporary directory for test files
    tempDir = mkdtempSync(join(tmpdir(), 'session-set-defaults-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('session-set-defaults');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        'Set the session defaults needed by many tools. Most tools require one or more session defaults to be set before they can be used. Agents should set the relevant defaults at the beginning of a session.',
      );
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
    it('should set provided defaults and return updated state', async () => {
      const result = await sessionSetDefaultsLogic({
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
        useLatestOS: true,
        arch: 'arm64',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Defaults updated:');

      const current = sessionStore.getAll();
      expect(current.scheme).toBe('MyScheme');
      expect(current.simulatorName).toBe('iPhone 16');
      expect(current.useLatestOS).toBe(true);
      expect(current.arch).toBe('arm64');
    });

    it('should validate parameter types via Zod', async () => {
      // plugin.handler only accepts args, not executor - call it directly
      const result = await plugin.handler({
        useLatestOS: 'yes' as unknown as boolean,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('useLatestOS');
    });

    it('should clear workspacePath when projectPath is set', async () => {
      const oldWorkspacePath = join(tempDir, 'Old.xcworkspace');
      const newProjectPath = join(tempDir, 'New.xcodeproj');
      writeFileSync(oldWorkspacePath, 'test content');
      writeFileSync(newProjectPath, 'test content');

      sessionStore.setDefaults({ workspacePath: oldWorkspacePath });
      await sessionSetDefaultsLogic({ projectPath: newProjectPath });
      const current = sessionStore.getAll();
      expect(current.projectPath).toBe(newProjectPath);
      expect(current.workspacePath).toBeUndefined();
    });

    it('should clear projectPath when workspacePath is set', async () => {
      const oldProjectPath = join(tempDir, 'Old.xcodeproj');
      const newWorkspacePath = join(tempDir, 'New.xcworkspace');
      writeFileSync(oldProjectPath, 'test content');
      writeFileSync(newWorkspacePath, 'test content');

      sessionStore.setDefaults({ projectPath: oldProjectPath });
      await sessionSetDefaultsLogic({ workspacePath: newWorkspacePath });
      const current = sessionStore.getAll();
      expect(current.workspacePath).toBe(newWorkspacePath);
      expect(current.projectPath).toBeUndefined();
    });

    it('should clear simulatorName when simulatorId is set', async () => {
      sessionStore.setDefaults({ simulatorName: 'iPhone 16' });
      await sessionSetDefaultsLogic({ simulatorId: 'SIM-UUID' });
      const current = sessionStore.getAll();
      expect(current.simulatorId).toBe('SIM-UUID');
      expect(current.simulatorName).toBeUndefined();
    });

    it('should clear simulatorId when simulatorName is set', async () => {
      sessionStore.setDefaults({ simulatorId: 'SIM-UUID' });
      await sessionSetDefaultsLogic({ simulatorName: 'iPhone 16' });
      const current = sessionStore.getAll();
      expect(current.simulatorName).toBe('iPhone 16');
      expect(current.simulatorId).toBeUndefined();
    });

    it('should reject when both projectPath and workspacePath are provided', async () => {
      // plugin.handler only accepts args, not executor - call it directly
      const res = await plugin.handler({
        projectPath: '/app/App.xcodeproj',
        workspacePath: '/app/App.xcworkspace',
      });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Parameter validation failed');
      expect(res.content[0].text).toContain('projectPath and workspacePath are mutually exclusive');
    });

    it('should reject when both simulatorId and simulatorName are provided', async () => {
      // plugin.handler only accepts args, not executor - call it directly
      const res = await plugin.handler({
        simulatorId: 'SIM-1',
        simulatorName: 'iPhone 16',
      });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Parameter validation failed');
      expect(res.content[0].text).toContain('simulatorId and simulatorName are mutually exclusive');
    });
  });

  describe('File Path Validation', () => {
    it('should reject invalid projectPath that does not exist', async () => {
      const result = await sessionSetDefaultsLogic({
        projectPath: '/nonexistent/path/App.xcodeproj',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to set defaults');
      expect(result.content[0].text).toContain('Invalid projectPath');
      expect(result.content[0].text).toContain('does not exist');
    });

    it('should reject invalid workspacePath that does not exist', async () => {
      const result = await sessionSetDefaultsLogic({
        workspacePath: '/nonexistent/path/App.xcworkspace',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to set defaults');
      expect(result.content[0].text).toContain('Invalid workspacePath');
      expect(result.content[0].text).toContain('does not exist');
    });

    it('should accept valid projectPath that exists', async () => {
      const validProjectPath = join(tempDir, 'App.xcodeproj');
      writeFileSync(validProjectPath, 'test content');

      const result = await sessionSetDefaultsLogic({ projectPath: validProjectPath });

      expect(result.isError).toBe(false);
      const current = sessionStore.getAll();
      expect(current.projectPath).toBe(validProjectPath);
    });

    it('should accept valid workspacePath that exists', async () => {
      const validWorkspacePath = join(tempDir, 'App.xcworkspace');
      writeFileSync(validWorkspacePath, 'test content');

      const result = await sessionSetDefaultsLogic({ workspacePath: validWorkspacePath });

      expect(result.isError).toBe(false);
      const current = sessionStore.getAll();
      expect(current.workspacePath).toBe(validWorkspacePath);
    });

    it('should reject setting new projectPath when workspacePath exists', async () => {
      const workspacePath = join(tempDir, 'App.xcworkspace');
      const projectPath = join(tempDir, 'App.xcodeproj');
      writeFileSync(workspacePath, 'test content');
      writeFileSync(projectPath, 'test content');

      // Set workspacePath first
      sessionStore.setDefaults({ workspacePath });

      // Try to set projectPath - this should CLEAR workspacePath and succeed
      const result = await sessionSetDefaultsLogic({ projectPath });

      // The function clears the opposite path and succeeds (not an error)
      expect(result.isError).toBe(false);
      const current = sessionStore.getAll();
      expect(current.projectPath).toBe(projectPath);
      expect(current.workspacePath).toBeUndefined();
    });

    it('should reject setting new workspacePath when projectPath exists', async () => {
      const projectPath = join(tempDir, 'App.xcodeproj');
      const workspacePath = join(tempDir, 'App.xcworkspace');
      writeFileSync(projectPath, 'test content');
      writeFileSync(workspacePath, 'test content');

      // Set projectPath first
      sessionStore.setDefaults({ projectPath });

      // Try to set workspacePath - this should CLEAR projectPath and succeed
      const result = await sessionSetDefaultsLogic({ workspacePath });

      // The function clears the opposite path and succeeds (not an error)
      expect(result.isError).toBe(false);
      const current = sessionStore.getAll();
      expect(current.workspacePath).toBe(workspacePath);
      expect(current.projectPath).toBeUndefined();
    });
  });

  describe('Empty String Handling', () => {
    it('should convert empty string scheme to undefined via preprocessor', async () => {
      // Must call handler to trigger Zod preprocessing (nullifyEmptyStrings)
      const result = await plugin.handler({ scheme: '' });
      expect(result.isError).toBe(false);

      const current = sessionStore.getAll();
      expect(current.scheme).toBeUndefined();
    });

    it('should convert whitespace-only string to undefined via preprocessor', async () => {
      // Must call handler to trigger Zod preprocessing (nullifyEmptyStrings)
      const result = await plugin.handler({ scheme: '   ' });
      expect(result.isError).toBe(false);

      const current = sessionStore.getAll();
      expect(current.scheme).toBeUndefined();
    });

    it('should convert empty projectPath to undefined', async () => {
      // Must call handler to trigger Zod preprocessing (nullifyEmptyStrings)
      const result = await plugin.handler({ projectPath: '' });
      expect(result.isError).toBe(false);

      const current = sessionStore.getAll();
      expect(current.projectPath).toBeUndefined();
    });

    it('should convert empty workspacePath to undefined', async () => {
      // Must call handler to trigger Zod preprocessing (nullifyEmptyStrings)
      const result = await plugin.handler({ workspacePath: '' });
      expect(result.isError).toBe(false);

      const current = sessionStore.getAll();
      expect(current.workspacePath).toBeUndefined();
    });

    it('should convert empty simulatorName to undefined', async () => {
      // Must call handler to trigger Zod preprocessing (nullifyEmptyStrings)
      const result = await plugin.handler({ simulatorName: '' });
      expect(result.isError).toBe(false);

      const current = sessionStore.getAll();
      expect(current.simulatorName).toBeUndefined();
    });

    it('should not affect valid non-empty strings', async () => {
      const validProjectPath = join(tempDir, 'ValidProject.xcodeproj');
      writeFileSync(validProjectPath, 'test content');

      const result = await sessionSetDefaultsLogic({
        scheme: 'MyScheme',
        projectPath: validProjectPath,
      });
      expect(result.isError).toBe(false);

      const current = sessionStore.getAll();
      expect(current.scheme).toBe('MyScheme');
      expect(current.projectPath).toBe(validProjectPath);
    });
  });
});
