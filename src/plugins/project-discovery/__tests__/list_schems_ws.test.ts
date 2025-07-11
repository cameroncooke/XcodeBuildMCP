import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import plugin from '../list_schems_ws.ts';

// Mock only child_process.spawn at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';
const mockSpawn = vi.mocked(spawn);

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('list_schems_ws plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('list_schems_ws');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Lists available schemes in the workspace. IMPORTANT: Requires workspacePath. Example: list_schems_ws({ workspacePath: '/path/to/MyProject.xcworkspace' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      expect(
        plugin.schema.safeParse({ workspacePath: '/path/to/MyWorkspace.xcworkspace' }).success,
      ).toBe(true);
      expect(plugin.schema.safeParse({ workspacePath: '/Users/dev/App.xcworkspace' }).success).toBe(
        true,
      );
    });

    it('should validate schema with invalid inputs', () => {
      expect(plugin.schema.safeParse({}).success).toBe(false);
      expect(plugin.schema.safeParse({ workspacePath: 123 }).success).toBe(false);
      expect(plugin.schema.safeParse({ workspacePath: null }).success).toBe(false);
      expect(plugin.schema.safeParse({ workspacePath: undefined }).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle schema validation error when workspacePath is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      await expect(plugin.handler({ workspacePath: null })).rejects.toThrow();
    });

    it('should return success with schemes found', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          `Information about workspace "MyWorkspace":
    Targets:
        MyApp
        MyAppTests

    Build Configurations:
        Debug
        Release

    Schemes:
        MyApp
        MyAppTests`,
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await plugin.handler({ workspacePath: '/path/to/MyProject.xcworkspace' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'xcodebuild -list -workspace /path/to/MyProject.xcworkspace'],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Available schemes:',
          },
          {
            type: 'text',
            text: 'MyApp\nMyAppTests',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Build the app: macos_build_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp" })
   or for iOS: ios_simulator_build_by_name_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp", simulatorName: "iPhone 16" })
2. Show build settings: show_build_set_ws({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp" })`,
          },
        ],
        isError: false,
      });
    });

    it('should return error when command fails', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Workspace not found');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await plugin.handler({ workspacePath: '/path/to/MyProject.xcworkspace' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to list schemes: Workspace not found' }],
        isError: true,
      });
    });

    it('should return error when no schemes found in output', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'Information about workspace "MyWorkspace":\n    Targets:\n        MyApp',
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await plugin.handler({ workspacePath: '/path/to/MyProject.xcworkspace' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'No schemes found in the output' }],
        isError: true,
      });
    });

    it('should return success with empty schemes list', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          `Information about workspace "MinimalWorkspace":
    Targets:
        MinimalApp

    Build Configurations:
        Debug
        Release

    Schemes:

`,
        );
        mockProcess.emit('close', 0);
      }, 0);

      const result = await plugin.handler({ workspacePath: '/path/to/MyProject.xcworkspace' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Available schemes:',
          },
          {
            type: 'text',
            text: '',
          },
          {
            type: 'text',
            text: '',
          },
        ],
        isError: false,
      });
    });

    it('should handle Error objects in catch blocks', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess as any);

      setTimeout(() => {
        mockProcess.emit('error', new Error('Command execution failed'));
      }, 0);

      const result = await plugin.handler({ workspacePath: '/path/to/MyProject.xcworkspace' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error listing schemes: Command execution failed' }],
        isError: true,
      });
    });

    it('should handle schema validation error when workspacePath is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      await expect(plugin.handler({ workspacePath: null })).rejects.toThrow();
    });
  });
});
