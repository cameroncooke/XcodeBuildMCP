import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';

// Import the plugin
import installAppSim from '../install_app_sim.ts';

// Mock only child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

// Mock file system for file existence checks
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

// Mock child process class
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('install_app_sim tool', () => {
  let mockSpawn: Record<string, unknown>;
  let mockExecSync: Record<string, unknown>;
  let mockExistsSync: Record<string, unknown>;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    const { spawn, execSync } = await import('child_process');
    const fs = await import('fs');

    mockSpawn = vi.mocked(spawn);
    mockExecSync = vi.mocked(execSync);
    mockExistsSync = vi.mocked(fs.existsSync);

    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    // Default to file exists
    mockExistsSync.mockReturnValue(true);

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(installAppSim.name).toBe('install_app_sim');
    });

    it('should have correct description', () => {
      expect(installAppSim.description).toBe(
        "Installs an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and appPath parameters. Example: install_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', appPath: '/path/to/your/app.app' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof installAppSim.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid and appPath string fields', () => {
      const schema = z.object(installAppSim.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
          appPath: '/path/to/app.app',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 'ABC123-DEF456',
          appPath: '/another/path/app.app',
        }).success,
      ).toBe(true);

      // Invalid inputs
      expect(
        schema.safeParse({
          simulatorUuid: 123,
          appPath: '/path/to/app.app',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
          appPath: 123,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          appPath: '/path/to/app.app',
        }).success,
      ).toBe(false);

      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle validation failure for simulatorUuid', async () => {
      const result = await installAppSim.handler({
        simulatorUuid: undefined,
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle validation failure for appPath', async () => {
      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: undefined,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "File not found: '/path/to/app.app'. Please check the path and try again.",
          },
        ],
        isError: true,
      });
    });

    it('should handle successful install', async () => {
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'App installed');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '/path/to/app.app',
      });

      // Verify command was called correctly
      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'xcrun simctl install test-uuid-123 /path/to/app.app'],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App installed successfully in simulator test-uuid-123',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Launch the app: launch_app_sim({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      // Set up command failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Install failed');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Install app in simulator operation failed: Install failed',
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      // Set up spawn error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Command execution failed'));
      }, 0);

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Install app in simulator operation failed: Command execution failed',
          },
        ],
      });
    });

    it('should handle exception with string error', async () => {
      // Set up spawn error with string
      setTimeout(() => {
        mockProcess.emit('error', 'String error');
      }, 0);

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Install app in simulator operation failed: String error',
          },
        ],
      });
    });
  });
});
