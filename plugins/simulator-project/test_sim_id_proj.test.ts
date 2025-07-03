/**
 * test_sim_id_proj Plugin Test - Test coverage for test_sim_id_proj tool
 *
 * This test file provides focused test coverage for the test_sim_id_proj tool:
 * - test_sim_id_proj: Run tests for project on simulator by UUID
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter validation testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import testSimIdProjPlugin from './test_sim_id_proj.ts';

// Mock external dependencies
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/test-common.ts', () => ({
  handleTestLogic: vi.fn(),
}));

vi.mock('../../src/utils/xcode.ts', () => ({
  XcodePlatform: {
    iOSSimulator: 'iOS Simulator',
  },
}));

describe('test_sim_id_proj plugin tests', () => {
  let mockHandleTestLogic: MockedFunction<any>;

  beforeEach(async () => {
    const testCommon = await import('../../src/utils/test-common.ts');
    mockHandleTestLogic = testCommon.handleTestLogic as MockedFunction<any>;

    // Setup default mock for handleTestLogic to return basic success response
    mockHandleTestLogic.mockResolvedValue({
      content: [{ type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyScheme.' }],
      isError: false,
    });

    vi.clearAllMocks();
  });

  describe('test_sim_id_proj tool', () => {
    it('should have correct plugin structure', () => {
      expect(testSimIdProjPlugin).toBeDefined();
      expect(testSimIdProjPlugin.name).toBe('test_sim_id_proj');
      expect(testSimIdProjPlugin.description).toBe(
        'Runs tests for a project on a simulator by UUID using xcodebuild test and parses xcresult output.',
      );
      expect(testSimIdProjPlugin.schema).toBeDefined();
      expect(testSimIdProjPlugin.handler).toBeDefined();
      expect(typeof testSimIdProjPlugin.handler).toBe('function');
    });

    describe('success scenarios', () => {
      it('should successfully run tests on project with simulator ID', async () => {
        // Mock handleTestLogic to return the expected response format
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyScheme.' },
            {
              type: 'text',
              text: '\nTest Results Summary:\nTest Summary: MyProject Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 8\n  Passed: 8\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
            },
          ],
          isError: false,
        });

        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
        };

        const result = await testSimIdProjPlugin.handler(params);

        expect(mockHandleTestLogic).toHaveBeenCalledWith(
          expect.objectContaining({
            projectPath: '/path/to/project.xcodeproj',
            scheme: 'MyScheme',
            simulatorId: 'ABC123-DEF456-789',
            configuration: 'Debug',
            useLatestOS: false,
            preferXcodebuild: false,
            platform: 'iOS Simulator',
          }),
        );

        expect(result.content).toEqual([
          { type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyScheme.' },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: MyProject Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 8\n  Passed: 8\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
          },
        ]);
        expect(result.isError).toBe(false);
      });

      it('should handle optional parameters correctly', async () => {
        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
          configuration: 'Release',
          derivedDataPath: '/custom/derived/data',
          extraArgs: ['-parallel-testing-enabled', 'YES'],
          useLatestOS: true,
          preferXcodebuild: true,
        };

        const result = await testSimIdProjPlugin.handler(params);

        expect(mockHandleTestLogic).toHaveBeenCalledWith(
          expect.objectContaining({
            projectPath: '/path/to/project.xcodeproj',
            scheme: 'MyScheme',
            simulatorId: 'ABC123-DEF456-789',
            configuration: 'Release',
            derivedDataPath: '/custom/derived/data',
            extraArgs: ['-parallel-testing-enabled', 'YES'],
            useLatestOS: true,
            preferXcodebuild: true,
            platform: 'iOS Simulator',
          }),
        );
        expect(result.isError).toBe(false);
      });
    });

    describe('error handling scenarios', () => {
      it('should handle test failures properly', async () => {
        // Mock handleTestLogic to return failure response
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '❌ iOS Simulator Test failed for scheme MyScheme.' },
            {
              type: 'text',
              text: '\nTest Results Summary:\nTest Summary: FailingProject Tests\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 5\n  Passed: 3\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testExample (MyProjectTests)\n     Assertion failed\n',
            },
          ],
          isError: true,
        });

        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
        };

        const result = await testSimIdProjPlugin.handler(params);

        expect(result.content).toEqual([
          { type: 'text', text: '❌ iOS Simulator Test failed for scheme MyScheme.' },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: FailingProject Tests\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 5\n  Passed: 3\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testExample (MyProjectTests)\n     Assertion failed\n',
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should handle command execution failure', async () => {
        // Mock handleTestLogic to throw error
        mockHandleTestLogic.mockRejectedValue(new Error('Build failed'));

        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
        };

        try {
          await testSimIdProjPlugin.handler(params);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Build failed');
        }
      });
    });

    describe('parameter validation', () => {
      it('should apply default values for optional parameters', async () => {
        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
          // Optional parameters omitted
        };

        await testSimIdProjPlugin.handler(params);

        expect(mockHandleTestLogic).toHaveBeenCalledWith(
          expect.objectContaining({
            configuration: 'Debug',
            useLatestOS: false,
            preferXcodebuild: false,
            platform: 'iOS Simulator',
          }),
        );
      });

      it('should call handleTestLogic with correct platform parameter', async () => {
        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
        };

        await testSimIdProjPlugin.handler(params);

        expect(mockHandleTestLogic).toHaveBeenCalledWith(
          expect.objectContaining({
            platform: 'iOS Simulator',
          }),
        );
      });
    });
  });
});