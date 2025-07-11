import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import getSimAppPathIdProj from '../get_sim_app_path_id_proj.ts';

// Mock only child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('get_sim_app_path_id_proj plugin', () => {
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
      expect(getSimAppPathIdProj.name).toBe('get_sim_app_path_id_proj');
    });

    it('should have correct description field', () => {
      expect(getSimAppPathIdProj.description).toBe(
        "Gets the app bundle path for a simulator by UUID using a project file. IMPORTANT: Requires projectPath, scheme, platform, and simulatorId. Example: get_sim_app_path_id_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof getSimAppPathIdProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(getSimAppPathIdProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid platform
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'InvalidPlatform',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid simulatorId
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          useLatestOS: true,
        }).success,
      ).toBe(true);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return validation error for missing projectPath', async () => {
      const result = await getSimAppPathIdProj.handler({
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
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
      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
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

    it('should return validation error for missing platform', async () => {
      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'platform' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return validation error for missing simulatorId', async () => {
      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return command error when command fails', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);

      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Command failed with error');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to get app path\nDetails: Command failed with error',
          },
        ],
        isError: true,
      });
    });

    it('should handle successful app path extraction', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);

      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app\n');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: '/path/to/MyApp.app' }],
        isError: false,
      });
    });

    it('should handle no app path found', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);

      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'No CODESIGNING_FOLDER_PATH found\n');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Could not find app path in build settings.' }],
        isError: true,
      });
    });

    it('should handle command generation with extra args', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);

      const mockProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Command failed');
        mockProcess.emit('close', 1);
      }, 0);

      await getSimAppPathIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        platform: 'iOS Simulator',
        simulatorId: 'test-uuid',
        configuration: 'Release',
        useLatestOS: false,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'xcodebuild',
        expect.arrayContaining([
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
        ]),
        expect.any(Object),
      );
    });
  });
});
