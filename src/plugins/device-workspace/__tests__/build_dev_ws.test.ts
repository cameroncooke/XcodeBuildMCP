/**
 * Tests for build_dev_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import buildDevWs from '../build_dev_ws.ts';

// Mock child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('build_dev_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildDevWs.name).toBe('build_dev_ws');
    });

    it('should have correct description', () => {
      expect(buildDevWs.description).toBe(
        "Builds an app from a workspace for a physical Apple device. IMPORTANT: Requires workspacePath and scheme. Example: build_dev_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildDevWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildDevWs.schema.workspacePath.safeParse('/path/to/workspace.xcworkspace').success,
      ).toBe(true);
      expect(buildDevWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildDevWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildDevWs.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(true);
      expect(buildDevWs.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(buildDevWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildDevWs.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(buildDevWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildDevWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    pid = 12345;
  }

  let mockSpawn: any;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation error response for workspacePath', async () => {
      const result = await buildDevWs.handler({
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation error response for scheme', async () => {
      const result = await buildDevWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should generate correct xcodebuild command for workspace', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      const resultPromise = buildDevWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
      });

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -workspace /path/to/workspace.xcworkspace -scheme MyScheme -configuration Debug -skipMacroValidation -destination "generic/platform=iOS" build',
        ],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      );
    });

    it('should return exact successful build response', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await buildDevWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ iOS Device Build build succeeded for scheme MyScheme.' },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_ios_device_app_path_workspace\n2. Get Bundle ID: get_ios_bundle_id',
          },
        ],
      });
    });

    it('should return exact build failure response', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'xcodebuild: error: Scheme NonExistentScheme not found');
        mockProcess.emit('close', 65);
      }, 0);

      const result = await buildDevWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'NonExistentScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ [stderr] xcodebuild: error: Scheme NonExistentScheme not found',
          },
          {
            type: 'text',
            text: '❌ iOS Device Build build failed for scheme NonExistentScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should use default configuration when not provided', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      await buildDevWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -workspace /path/to/workspace.xcworkspace -scheme MyScheme -configuration Debug -skipMacroValidation -destination "generic/platform=iOS" build',
        ],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      );
    });
  });
});
