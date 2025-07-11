import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import buildSimNameProj from '../build_sim_name_proj.ts';

// Mock only child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('build_sim_name_proj plugin', () => {
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
      expect(buildSimNameProj.name).toBe('build_sim_name_proj');
    });

    it('should have correct description field', () => {
      expect(buildSimNameProj.description).toBe(
        "Builds an app from a project file for a specific simulator by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: build_sim_name_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof buildSimNameProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildSimNameProj.schema);

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
      const result = await buildSimNameProj.handler({
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
      const result = await buildSimNameProj.handler({
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
      const result = await buildSimNameProj.handler({
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

      const result = await buildSimNameProj.handler({
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

    it('should handle successful build', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);

      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await buildSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "✅ iOS Simulator build succeeded for scheme MyScheme targeting simulator name 'iPhone 16'.",
          },
        ],
        isError: false,
      });
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

      await buildSimNameProj.handler({
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
