import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import testSimIdProj from './test_sim_id_proj.ts';

// Mock external dependencies
vi.mock('../../utils/index.js', () => ({
  handleTestLogic: vi.fn(),
  XcodePlatform: {
    iOSSimulator: 'iOS Simulator',
  },
}));

describe('test_sim_id_proj plugin', () => {
  let mockHandleTestLogic: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../utils/index.js');
    mockHandleTestLogic = utils.handleTestLogic as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(testSimIdProj.name).toBe('test_sim_id_proj');
    });

    it('should have correct description field', () => {
      expect(testSimIdProj.description).toBe(
        'Runs tests for a project on a simulator by UUID using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler as a function', () => {
      expect(typeof testSimIdProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(testSimIdProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid simulatorId
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--arg1', '--arg2'],
          useLatestOS: true,
          preferXcodebuild: true,
        }).success,
      ).toBe(true);

      // Invalid configuration
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 123,
        }).success,
      ).toBe(false);

      // Invalid derivedDataPath
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          derivedDataPath: 123,
        }).success,
      ).toBe(false);

      // Invalid extraArgs
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          extraArgs: 'not-array',
        }).success,
      ).toBe(false);

      // Invalid useLatestOS
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          useLatestOS: 'yes',
        }).success,
      ).toBe(false);

      // Invalid preferXcodebuild
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          preferXcodebuild: 'yes',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success when tests pass', async () => {
      mockHandleTestLogic.mockResolvedValue({
        content: [{ type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyScheme.' }],
        isError: false,
      });

      const result = await testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyScheme.' }],
        isError: false,
      });
    });

    it('should return error when tests fail', async () => {
      mockHandleTestLogic.mockResolvedValue({
        content: [{ type: 'text', text: '❌ iOS Simulator Test failed for scheme MyScheme.' }],
        isError: true,
      });

      const result = await testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: '❌ iOS Simulator Test failed for scheme MyScheme.' }],
        isError: true,
      });
    });

    it('should call handleTestLogic with correct parameters', async () => {
      mockHandleTestLogic.mockResolvedValue({
        content: [{ type: 'text', text: 'Test completed' }],
        isError: false,
      });

      await testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--arg1'],
        useLatestOS: true,
        preferXcodebuild: true,
      });

      expect(mockHandleTestLogic).toHaveBeenCalledWith({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--arg1'],
        useLatestOS: true,
        preferXcodebuild: true,
        platform: 'iOS Simulator',
      });
    });

    it('should apply default values for optional parameters', async () => {
      mockHandleTestLogic.mockResolvedValue({
        content: [{ type: 'text', text: 'Test completed' }],
        isError: false,
      });

      await testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(mockHandleTestLogic).toHaveBeenCalledWith({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
        configuration: 'Debug',
        useLatestOS: false,
        preferXcodebuild: false,
        platform: 'iOS Simulator',
      });
    });

    it('should handle Exception objects correctly', async () => {
      mockHandleTestLogic.mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(
        testSimIdProj.handler({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        }),
      ).rejects.toThrow('Test error');
    });

    it('should handle string errors correctly', async () => {
      mockHandleTestLogic.mockImplementation(() => {
        throw 'String error';
      });

      await expect(
        testSimIdProj.handler({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        }),
      ).rejects.toBe('String error');
    });
  });
});
