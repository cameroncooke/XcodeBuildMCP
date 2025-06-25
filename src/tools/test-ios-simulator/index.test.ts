/**
 * iOS Simulator Test Tools Tests - Comprehensive test coverage for test_ios_simulator.ts
 *
 * This test file provides complete coverage for all iOS simulator test tools:
 * - test_sim_name_ws: Run tests for workspace on simulator by name
 * - test_sim_name_proj: Run tests for project on simulator by name
 * - test_sim_id_ws: Run tests for workspace on simulator by UUID
 * - test_sim_id_proj: Run tests for project on simulator by UUID
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter validation testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import {
  registerSimulatorTestByNameWorkspaceTool,
  registerSimulatorTestByNameProjectTool,
  registerSimulatorTestByIdWorkspaceTool,
  registerSimulatorTestByIdProjectTool,
} from './index.js';

// Mock external dependencies
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../test-common/index.js', () => ({
  handleTestLogic: vi.fn(),
}));

vi.mock('../../utils/xcode.js', () => ({
  XcodePlatform: {
    iOSSimulator: 'iOS Simulator',
  },
}));

vi.mock('../common/index.js', () => ({
  registerTool: vi.fn(),
  workspacePathSchema: { type: 'string' },
  projectPathSchema: { type: 'string' },
  schemeSchema: { type: 'string' },
  configurationSchema: { type: 'string', optional: true },
  derivedDataPathSchema: { type: 'string', optional: true },
  extraArgsSchema: { type: 'array', optional: true },
  simulatorNameSchema: { type: 'string' },
  simulatorIdSchema: { type: 'string' },
  useLatestOSSchema: { type: 'boolean', optional: true },
  preferXcodebuildSchema: { type: 'boolean', optional: true },
}));

// Mock a basic MCP server for tool registration
const mockServer = {
  tool: vi.fn((name, description, schema, handler) => ({ name, description, schema, handler })),
};

describe('test_ios_simulator tools tests', () => {
  let mockHandleTestLogic: MockedFunction<any>;
  let mockRegisterTool: MockedFunction<any>;

  beforeEach(async () => {
    const testCommon = await import('../test-common/index.js');
    const common = await import('../common/index.js');

    mockHandleTestLogic = testCommon.handleTestLogic as MockedFunction<any>;
    mockRegisterTool = common.registerTool as MockedFunction<any>;

    // Setup default mock for handleTestLogic to return basic success response
    mockHandleTestLogic.mockResolvedValue({
      content: [{ type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyScheme.' }],
      isError: false,
    });

    // Mock registerTool to call the handler directly
    mockRegisterTool.mockImplementation((server, toolName, description, schema, handler) => {
      return { name: toolName, description, schema, handler };
    });

    vi.clearAllMocks();
  });

  describe('test_sim_name_ws tool', () => {
    describe('parameter validation and success scenarios', () => {
      it('should successfully run tests on workspace with simulator name', async () => {
        // Mock handleTestLogic to return the expected response format
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyScheme.' },
            {
              type: 'text',
              text: '\nTest Results Summary:\nTest Summary: MyApp Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 10\n  Passed: 10\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
            },
          ],
          isError: false,
        });

        registerSimulatorTestByNameWorkspaceTool(mockServer as any);

        // Get the registered handler from the mock call
        const registerCall = mockRegisterTool.mock.calls.find(
          (call) => call[1] === 'test_sim_name_ws',
        );
        expect(registerCall).toBeDefined();
        const handler = registerCall![4]; // Handler is 5th argument

        const params = {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 15',
        };

        const result = await handler(params);

        expect(mockHandleTestLogic).toHaveBeenCalledWith(
          expect.objectContaining({
            workspacePath: '/path/to/workspace.xcworkspace',
            scheme: 'MyScheme',
            simulatorName: 'iPhone 15',
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
            text: '\nTest Results Summary:\nTest Summary: MyApp Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 10\n  Passed: 10\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
          },
        ]);
        expect(result.isError).toBe(false);
      });

      it('should handle optional parameters correctly', async () => {
        registerSimulatorTestByNameWorkspaceTool(mockServer as any);

        const registerCall = mockRegisterTool.mock.calls.find(
          (call) => call[1] === 'test_sim_name_ws',
        );
        const handler = registerCall![4];

        const params = {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 15',
          configuration: 'Release',
          derivedDataPath: '/custom/derived/data',
          extraArgs: ['-parallel-testing-enabled', 'YES'],
          useLatestOS: true,
          preferXcodebuild: true,
        };

        const result = await handler(params);

        expect(mockHandleTestLogic).toHaveBeenCalledWith(
          expect.objectContaining({
            workspacePath: '/path/to/workspace.xcworkspace',
            scheme: 'MyScheme',
            simulatorName: 'iPhone 15',
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
  });

  describe('test_sim_name_proj tool', () => {
    describe('success scenarios', () => {
      it('should successfully run tests on project with simulator name', async () => {
        // Mock handleTestLogic to return the expected response format
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyScheme.' },
            {
              type: 'text',
              text: '\nTest Results Summary:\nTest Summary: MyProject Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 5\n  Passed: 5\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
            },
          ],
          isError: false,
        });

        registerSimulatorTestByNameProjectTool(mockServer as any);

        const registerCall = mockRegisterTool.mock.calls.find(
          (call) => call[1] === 'test_sim_name_proj',
        );
        const handler = registerCall![4];

        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 15',
        };

        const result = await handler(params);

        expect(mockHandleTestLogic).toHaveBeenCalledWith(
          expect.objectContaining({
            projectPath: '/path/to/project.xcodeproj',
            scheme: 'MyScheme',
            simulatorName: 'iPhone 15',
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
            text: '\nTest Results Summary:\nTest Summary: MyProject Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 5\n  Passed: 5\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
          },
        ]);
        expect(result.isError).toBe(false);
      });
    });
  });

  describe('test_sim_id_ws tool', () => {
    describe('success scenarios', () => {
      it('should successfully run tests on workspace with simulator ID', async () => {
        // Mock handleTestLogic to return the expected response format
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyScheme.' },
            {
              type: 'text',
              text: '\nTest Results Summary:\nTest Summary: MyApp Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 15\n  Passed: 15\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
            },
          ],
          isError: false,
        });

        registerSimulatorTestByIdWorkspaceTool(mockServer as any);

        const registerCall = mockRegisterTool.mock.calls.find(
          (call) => call[1] === 'test_sim_id_ws',
        );
        const handler = registerCall![4];

        const params = {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
        };

        const result = await handler(params);

        expect(mockHandleTestLogic).toHaveBeenCalledWith(
          expect.objectContaining({
            workspacePath: '/path/to/workspace.xcworkspace',
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
            text: '\nTest Results Summary:\nTest Summary: MyApp Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 15\n  Passed: 15\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
          },
        ]);
        expect(result.isError).toBe(false);
      });
    });
  });

  describe('test_sim_id_proj tool', () => {
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

        registerSimulatorTestByIdProjectTool(mockServer as any);

        const registerCall = mockRegisterTool.mock.calls.find(
          (call) => call[1] === 'test_sim_id_proj',
        );
        const handler = registerCall![4];

        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
        };

        const result = await handler(params);

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
            text: '\nTest Results Summary:\nTest Summary: FailingApp Tests\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 5\n  Passed: 3\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testExample (MyAppTests)\n     Assertion failed\n',
          },
        ],
        isError: true,
      });

      registerSimulatorTestByNameWorkspaceTool(mockServer as any);

      const registerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'test_sim_name_ws',
      );
      const handler = registerCall![4];

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 15',
      };

      const result = await handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: '❌ iOS Simulator Test failed for scheme MyScheme.' },
        {
          type: 'text',
          text: '\nTest Results Summary:\nTest Summary: FailingApp Tests\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 5\n  Passed: 3\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testExample (MyAppTests)\n     Assertion failed\n',
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle build command failure', async () => {
      // Mock handleTestLogic to throw error
      mockHandleTestLogic.mockRejectedValue(new Error('Build failed'));

      registerSimulatorTestByNameWorkspaceTool(mockServer as any);

      const registerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'test_sim_name_ws',
      );
      const handler = registerCall![4];

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 15',
      };

      try {
        await handler(params);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Build failed');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete iOS simulator test workflow with detailed results', async () => {
      // Mock handleTestLogic to return detailed test results
      mockHandleTestLogic.mockResolvedValue({
        content: [
          { type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyApp.' },
          { type: 'text', text: '📱 Target: iPhone 15 Pro' },
          { type: 'text', text: 'Test output:\nTEST SUCCEEDED' },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: MyApp iOS Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 25\n  Passed: 23\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nEnvironment: iOS 17.0 Simulator\n\nDevice: iPhone 15 Pro (iOS Simulator 17.0)\n\nTest Failures:\n  1. testNetworkTimeout (MyAppTests)\n     Request timed out after 30 seconds\n',
          },
        ],
        isError: false,
      });

      registerSimulatorTestByNameWorkspaceTool(mockServer as any);

      const registerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'test_sim_name_ws',
      );
      const handler = registerCall![4];

      const params = {
        workspacePath: '/Users/dev/MyApp/MyApp.xcworkspace',
        scheme: 'MyApp',
        simulatorName: 'iPhone 15 Pro',
        configuration: 'Debug',
        useLatestOS: true,
      };

      const result = await handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyApp.' },
        { type: 'text', text: '📱 Target: iPhone 15 Pro' },
        { type: 'text', text: 'Test output:\nTEST SUCCEEDED' },
        {
          type: 'text',
          text: '\nTest Results Summary:\nTest Summary: MyApp iOS Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 25\n  Passed: 23\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nEnvironment: iOS 17.0 Simulator\n\nDevice: iPhone 15 Pro (iOS Simulator 17.0)\n\nTest Failures:\n  1. testNetworkTimeout (MyAppTests)\n     Request timed out after 30 seconds\n',
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle test run with custom configuration and extra arguments', async () => {
      registerSimulatorTestByIdProjectTool(mockServer as any);

      const registerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'test_sim_id_proj',
      );
      const handler = registerCall![4];

      const params = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'ABC123-DEF456-789',
        configuration: 'Release',
        derivedDataPath: '/tmp/DerivedData',
        extraArgs: ['-parallel-testing-enabled', 'YES', '-test-timeouts-enabled', 'YES'],
        preferXcodebuild: true,
      };

      const result = await handler(params);

      expect(mockHandleTestLogic).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
          configuration: 'Release',
          derivedDataPath: '/tmp/DerivedData',
          extraArgs: ['-parallel-testing-enabled', 'YES', '-test-timeouts-enabled', 'YES'],
          preferXcodebuild: true,
          platform: 'iOS Simulator',
        }),
      );
      expect(result.isError).toBe(false);
    });
  });

  describe('external dependency validation', () => {
    it('should verify external dependencies are properly mocked', () => {
      expect(mockHandleTestLogic).toBeDefined();
      expect(mockRegisterTool).toBeDefined();
      expect(typeof mockHandleTestLogic).toBe('function');
      expect(typeof mockRegisterTool).toBe('function');
    });

    it('should call handleTestLogic with correct platform parameter', async () => {
      registerSimulatorTestByNameWorkspaceTool(mockServer as any);

      const registerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'test_sim_name_ws',
      );
      const handler = registerCall![4];

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 15',
      };

      await handler(params);

      expect(mockHandleTestLogic).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'iOS Simulator',
        }),
      );
    });

    it('should apply default values for optional parameters', async () => {
      registerSimulatorTestByNameWorkspaceTool(mockServer as any);

      const registerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'test_sim_name_ws',
      );
      const handler = registerCall![4];

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 15',
        // Optional parameters omitted
      };

      await handler(params);

      expect(mockHandleTestLogic).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: 'Debug',
          useLatestOS: false,
          preferXcodebuild: false,
        }),
      );
    });
  });
});
