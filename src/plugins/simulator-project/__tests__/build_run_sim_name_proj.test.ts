import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import buildRunSimNameProj from '../build_run_sim_name_proj.ts';

// Mock only child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

describe('build_run_sim_name_proj plugin', () => {
  class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    pid = 12345;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(buildRunSimNameProj.name).toBe('build_run_sim_name_proj');
    });

    it('should have correct description field', () => {
      expect(buildRunSimNameProj.description).toBe(
        "Builds and runs an app from a project file on a simulator specified by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: build_run_sim_name_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof buildRunSimNameProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildRunSimNameProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid simulatorName
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--arg1', '--arg2'],
          useLatestOS: true,
          preferXcodebuild: true,
        }).success,
      ).toBe(true);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return validation error for missing projectPath', async () => {
      const result = await buildRunSimNameProj.handler({
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
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

    it('should return validation error for missing scheme', async () => {
      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        simulatorName: 'iPhone 16',
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

    it('should return validation error for missing simulatorName', async () => {
      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorName' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return build error when build fails', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);

      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Build failed with error');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Error: Xcode build failed\nDetails: Build failed with error' },
        ],
        isError: true,
      });
    });

    it('should handle successful build and run', async () => {
      const { spawn, execSync } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);
      const mockExecSync = vi.mocked(execSync);

      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      // Mock xcodebuild success
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      // Mock subsequent command calls
      const simulatorListOutput = JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            {
              name: 'iPhone 16',
              udid: 'test-uuid-123',
              isAvailable: true,
            },
          ],
        },
      });

      mockExecSync
        .mockReturnValueOnce('CODESIGNING_FOLDER_PATH = /path/to/MyApp.app') // showBuildSettings
        .mockReturnValueOnce(simulatorListOutput) // simulator list
        .mockReturnValueOnce('    iPhone 16 (test-uuid-123) (Booted)') // simulator state
        .mockReturnValueOnce('') // open Simulator
        .mockReturnValueOnce('') // install app
        .mockReturnValueOnce('com.example.MyApp') // bundle ID
        .mockReturnValueOnce(''); // launch app

      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅ iOS simulator build and run succeeded');
      expect(result.content[0].text).toContain('com.example.MyApp');
    });

    it('should handle command generation with extra args', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);

      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Build failed');
        mockProcess.emit('close', 1);
      }, 0);

      await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--custom-arg'],
        preferXcodebuild: true,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'xcodebuild',
        expect.arrayContaining([
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
          '-derivedDataPath',
          '/path/to/derived',
          '--custom-arg',
        ]),
        expect.any(Object),
      );
    });
  });
});
