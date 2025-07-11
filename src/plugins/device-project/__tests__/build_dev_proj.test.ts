/**
 * Tests for build_dev_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import buildDevProj from '../build_dev_proj.ts';

// Mock only child_process.spawn at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('build_dev_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildDevProj.name).toBe('build_dev_proj');
    });

    it('should have correct description', () => {
      expect(buildDevProj.description).toBe(
        "Builds an app from a project file for a physical Apple device. IMPORTANT: Requires projectPath and scheme. Example: build_dev_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildDevProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildDevProj.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success,
      ).toBe(true);
      expect(buildDevProj.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildDevProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildDevProj.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildDevProj.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildDevProj.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildDevProj.schema.projectPath.safeParse(null).success).toBe(false);
      expect(buildDevProj.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildDevProj.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildDevProj.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const childProcess = await import('child_process');
    mockSpawn = vi.mocked(childProcess.spawn);
    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation failure response for missing projectPath', async () => {
      const result = await buildDevProj.handler({
        projectPath: null,
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation failure response for missing scheme', async () => {
      const result = await buildDevProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: null,
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

    it('should generate correct xcodebuild command for device build', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      await buildDevProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -project /path/to/MyProject.xcodeproj -scheme MyScheme -configuration Debug -skipMacroValidation -destination "generic/platform=iOS" build',
        ],
        expect.any(Object),
      );
    });

    it('should return exact successful build response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await buildDevProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ iOS Device Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_ios_device_app_path_project\n2. Get Bundle ID: get_ios_bundle_id',
          },
        ],
      });
    });

    it('should return exact build failure response', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Compilation error');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await buildDevProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ [stderr] Compilation error',
          },
          {
            type: 'text',
            text: '❌ iOS Device Build build failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should include optional parameters in command', async () => {
      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Build succeeded');
        mockProcess.emit('close', 0);
      }, 0);

      await buildDevProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/tmp/derived-data',
        extraArgs: ['--verbose'],
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -project /path/to/MyProject.xcodeproj -scheme MyScheme -configuration Release -skipMacroValidation -destination "generic/platform=iOS" -derivedDataPath /tmp/derived-data --verbose build',
        ],
        expect.any(Object),
      );
    });
  });
});
