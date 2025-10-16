import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sessionStore } from '../session-store.ts';

describe('SessionStore', () => {
  let tempDir: string;

  beforeEach(() => {
    sessionStore.clear();
    // Create a temporary directory for test files
    tempDir = mkdtempSync(join(tmpdir(), 'session-store-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
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

  describe('File Path Validation', () => {
    it('should reject invalid projectPath that does not exist', () => {
      const invalidPath = '/nonexistent/path/App.xcodeproj';
      expect(() => {
        sessionStore.setDefaults({ projectPath: invalidPath });
      }).toThrow('Invalid projectPath: /nonexistent/path/App.xcodeproj does not exist');
    });

    it('should reject invalid workspacePath that does not exist', () => {
      const invalidPath = '/nonexistent/path/App.xcworkspace';
      expect(() => {
        sessionStore.setDefaults({ workspacePath: invalidPath });
      }).toThrow('Invalid workspacePath: /nonexistent/path/App.xcworkspace does not exist');
    });

    it('should accept valid projectPath that exists', () => {
      const validProjectPath = join(tempDir, 'App.xcodeproj');
      writeFileSync(validProjectPath, 'test content');

      expect(() => {
        sessionStore.setDefaults({ projectPath: validProjectPath });
      }).not.toThrow();

      expect(sessionStore.get('projectPath')).toBe(validProjectPath);
    });

    it('should accept valid workspacePath that exists', () => {
      const validWorkspacePath = join(tempDir, 'App.xcworkspace');
      writeFileSync(validWorkspacePath, 'test content');

      expect(() => {
        sessionStore.setDefaults({ workspacePath: validWorkspacePath });
      }).not.toThrow();

      expect(sessionStore.get('workspacePath')).toBe(validWorkspacePath);
    });
  });

  describe('Mutual Exclusivity Validation', () => {
    it('should reject setting both projectPath and workspacePath in same call', () => {
      const projectPath = join(tempDir, 'App.xcodeproj');
      const workspacePath = join(tempDir, 'App.xcworkspace');
      writeFileSync(projectPath, 'test content');
      writeFileSync(workspacePath, 'test content');

      expect(() => {
        sessionStore.setDefaults({ projectPath, workspacePath });
      }).toThrow('Cannot set both projectPath and workspacePath in session defaults');
    });
  });

  describe('Conflict Detection with Existing Session State', () => {
    it('should reject new projectPath when workspacePath already exists in session', () => {
      const workspacePath = join(tempDir, 'App.xcworkspace');
      const projectPath = join(tempDir, 'App.xcodeproj');
      writeFileSync(workspacePath, 'test content');
      writeFileSync(projectPath, 'test content');

      // First set workspacePath
      sessionStore.setDefaults({ workspacePath });

      // Then try to set projectPath
      expect(() => {
        sessionStore.setDefaults({ projectPath });
      }).toThrow(
        'Session already has workspacePath set. Clear it first with: ' +
          'session-clear-defaults({ keys: ["workspacePath"] })',
      );
    });

    it('should reject new workspacePath when projectPath already exists in session', () => {
      const projectPath = join(tempDir, 'App.xcodeproj');
      const workspacePath = join(tempDir, 'App.xcworkspace');
      writeFileSync(projectPath, 'test content');
      writeFileSync(workspacePath, 'test content');

      // First set projectPath
      sessionStore.setDefaults({ projectPath });

      // Then try to set workspacePath
      expect(() => {
        sessionStore.setDefaults({ workspacePath });
      }).toThrow(
        'Session already has projectPath set. Clear it first with: ' +
          'session-clear-defaults({ keys: ["projectPath"] })',
      );
    });

    it('should allow setting new projectPath after clearing existing workspacePath', () => {
      const workspacePath = join(tempDir, 'App.xcworkspace');
      const projectPath = join(tempDir, 'App.xcodeproj');
      writeFileSync(workspacePath, 'test content');
      writeFileSync(projectPath, 'test content');

      // Set workspacePath
      sessionStore.setDefaults({ workspacePath });

      // Clear workspacePath
      sessionStore.clear(['workspacePath']);

      // Now setting projectPath should succeed
      expect(() => {
        sessionStore.setDefaults({ projectPath });
      }).not.toThrow();

      expect(sessionStore.get('projectPath')).toBe(projectPath);
      expect(sessionStore.get('workspacePath')).toBeUndefined();
    });

    it('should allow setting new workspacePath after clearing existing projectPath', () => {
      const projectPath = join(tempDir, 'App.xcodeproj');
      const workspacePath = join(tempDir, 'App.xcworkspace');
      writeFileSync(projectPath, 'test content');
      writeFileSync(workspacePath, 'test content');

      // Set projectPath
      sessionStore.setDefaults({ projectPath });

      // Clear projectPath
      sessionStore.clear(['projectPath']);

      // Now setting workspacePath should succeed
      expect(() => {
        sessionStore.setDefaults({ workspacePath });
      }).not.toThrow();

      expect(sessionStore.get('workspacePath')).toBe(workspacePath);
      expect(sessionStore.get('projectPath')).toBeUndefined();
    });
  });

  describe('Empty String Handling', () => {
    it('should store empty string as-is when provided', () => {
      // Note: sessionStore itself does not transform empty strings
      // Transformation happens at the Zod schema level via nullifyEmptyStrings preprocessor
      sessionStore.setDefaults({ scheme: '' });
      expect(sessionStore.get('scheme')).toBe('');
    });

    it('should store whitespace-only string as-is', () => {
      sessionStore.setDefaults({ scheme: '   ' });
      expect(sessionStore.get('scheme')).toBe('   ');
    });

    it('should handle empty projectPath', () => {
      sessionStore.setDefaults({ projectPath: '' });
      expect(sessionStore.get('projectPath')).toBe('');
    });

    it('should handle empty workspacePath', () => {
      sessionStore.setDefaults({ workspacePath: '' });
      expect(sessionStore.get('workspacePath')).toBe('');
    });

    it('should distinguish between undefined and empty string', () => {
      sessionStore.setDefaults({ scheme: '' });
      expect(sessionStore.get('scheme')).toBe('');
      expect(sessionStore.get('configuration')).toBeUndefined();
    });
  });
});
