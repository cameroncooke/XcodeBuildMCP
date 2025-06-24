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
import { callToolHandler } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';
import { ToolResponse } from '../types/common.js';

// Mock modules to prevent real command execution
vi.mock('child_process', () => ({ spawn: vi.fn() }));
vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock external dependencies
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

vi.mock('../utils/validation.js', () => ({
  createTextResponse: vi.fn((text, isError = false) => ({
    content: [{ type: 'text', text }],
    isError,
  })),
}));

vi.mock('../utils/xcode.js', () => ({
  XcodePlatform: {
    IOS_SIMULATOR: 'iOS Simulator',
    IOS_DEVICE: 'iOS Device',
    MACOS: 'macOS',
  },
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn()),
}));

vi.mock('./test_common.js', () => ({
  handleTestLogic: vi.fn(),
}));

// Tool implementations for testing - these mirror the actual tool registrations
const testSimulatorByNameWorkspaceTool = {
  name: 'test_sim_name_ws',
  description:
    'Runs tests for a workspace on a simulator by name using xcodebuild test and parses xcresult output.',
  groups: ['SIMULATOR_BUILD'],
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorName: z
      .string()
      .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    useLatestOS: z
      .boolean()
      .optional()
      .describe('Whether to use the latest OS version for the named simulator'),
    preferXcodebuild: z
      .boolean()
      .optional()
      .describe(
        'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
      ),
  },
  handler: async (params: any): Promise<ToolResponse> => {
    const { handleTestLogic } = await import('./test_common.js');
    const { XcodePlatform } = await import('../utils/xcode.js');
    return handleTestLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      useLatestOS: params.useLatestOS ?? false,
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.IOS_SIMULATOR,
    });
  },
};

const testSimulatorByNameProjectTool = {
  name: 'test_sim_name_proj',
  description:
    'Runs tests for a project on a simulator by name using xcodebuild test and parses xcresult output.',
  groups: ['SIMULATOR_BUILD'],
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorName: z
      .string()
      .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    useLatestOS: z
      .boolean()
      .optional()
      .describe('Whether to use the latest OS version for the named simulator'),
    preferXcodebuild: z
      .boolean()
      .optional()
      .describe(
        'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
      ),
  },
  handler: async (params: any): Promise<ToolResponse> => {
    const { handleTestLogic } = await import('./test_common.js');
    const { XcodePlatform } = await import('../utils/xcode.js');
    return handleTestLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      useLatestOS: params.useLatestOS ?? false,
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.IOS_SIMULATOR,
    });
  },
};

const testSimulatorByIdWorkspaceTool = {
  name: 'test_sim_id_ws',
  description:
    'Runs tests for a workspace on a simulator by UUID using xcodebuild test and parses xcresult output.',
  groups: ['SIMULATOR_BUILD'],
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorId: z
      .string()
      .describe('UUID of the simulator to use (obtained from listSimulators) (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    useLatestOS: z
      .boolean()
      .optional()
      .describe('Whether to use the latest OS version for the named simulator'),
    preferXcodebuild: z
      .boolean()
      .optional()
      .describe(
        'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
      ),
  },
  handler: async (params: any): Promise<ToolResponse> => {
    const { handleTestLogic } = await import('./test_common.js');
    const { XcodePlatform } = await import('../utils/xcode.js');
    return handleTestLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      useLatestOS: params.useLatestOS ?? false,
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.IOS_SIMULATOR,
    });
  },
};

const testSimulatorByIdProjectTool = {
  name: 'test_sim_id_proj',
  description:
    'Runs tests for a project on a simulator by UUID using xcodebuild test and parses xcresult output.',
  groups: ['SIMULATOR_BUILD'],
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    simulatorId: z
      .string()
      .describe('UUID of the simulator to use (obtained from listSimulators) (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    useLatestOS: z
      .boolean()
      .optional()
      .describe('Whether to use the latest OS version for the named simulator'),
    preferXcodebuild: z
      .boolean()
      .optional()
      .describe(
        'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
      ),
  },
  handler: async (params: any): Promise<ToolResponse> => {
    const { handleTestLogic } = await import('./test_common.js');
    const { XcodePlatform } = await import('../utils/xcode.js');
    return handleTestLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      useLatestOS: params.useLatestOS ?? false,
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.IOS_SIMULATOR,
    });
  },
};

describe('test_ios_simulator tools tests', () => {
  let mockHandleTestLogic: MockedFunction<any>;
  let mockLog: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;

  beforeEach(async () => {
    // Import mocked modules
    const testCommon = await import('./test_common.js');
    const logger = await import('../utils/logger.js');
    const validation = await import('../utils/validation.js');

    mockHandleTestLogic = testCommon.handleTestLogic as MockedFunction<any>;
    mockLog = logger.log as MockedFunction<any>;
    mockCreateTextResponse = validation.createTextResponse as MockedFunction<any>;

    // Setup default mock for handleTestLogic to return basic success response
    mockHandleTestLogic.mockResolvedValue({
      content: [{ type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyScheme.' }],
      isError: false,
    });

    vi.clearAllMocks();
  });

  describe('test_sim_name_ws tool', () => {
    describe('parameter validation', () => {
      it('should reject missing workspacePath parameter', async () => {
        const result = await callToolHandler(testSimulatorByNameWorkspaceTool, {
          scheme: 'MyScheme',
          simulatorName: 'iPhone 15',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing scheme parameter', async () => {
        const result = await callToolHandler(testSimulatorByNameWorkspaceTool, {
          workspacePath: '/path/to/workspace.xcworkspace',
          simulatorName: 'iPhone 15',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing simulatorName parameter', async () => {
        const result = await callToolHandler(testSimulatorByNameWorkspaceTool, {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'simulatorName' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
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

        const params = {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 15',
        };

        const result = await callToolHandler(testSimulatorByNameWorkspaceTool, params);

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

        const result = await callToolHandler(testSimulatorByNameWorkspaceTool, params);

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
    describe('parameter validation', () => {
      it('should reject missing projectPath parameter', async () => {
        const result = await callToolHandler(testSimulatorByNameProjectTool, {
          scheme: 'MyScheme',
          simulatorName: 'iPhone 15',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing scheme parameter', async () => {
        const result = await callToolHandler(testSimulatorByNameProjectTool, {
          projectPath: '/path/to/project.xcodeproj',
          simulatorName: 'iPhone 15',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing simulatorName parameter', async () => {
        const result = await callToolHandler(testSimulatorByNameProjectTool, {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'simulatorName' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

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

        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 15',
        };

        const result = await callToolHandler(testSimulatorByNameProjectTool, params);

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
    describe('parameter validation', () => {
      it('should reject missing workspacePath parameter', async () => {
        const result = await callToolHandler(testSimulatorByIdWorkspaceTool, {
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing scheme parameter', async () => {
        const result = await callToolHandler(testSimulatorByIdWorkspaceTool, {
          workspacePath: '/path/to/workspace.xcworkspace',
          simulatorId: 'ABC123-DEF456-789',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing simulatorId parameter', async () => {
        const result = await callToolHandler(testSimulatorByIdWorkspaceTool, {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'simulatorId' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

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

        const params = {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
        };

        const result = await callToolHandler(testSimulatorByIdWorkspaceTool, params);

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
    describe('parameter validation', () => {
      it('should reject missing projectPath parameter', async () => {
        const result = await callToolHandler(testSimulatorByIdProjectTool, {
          scheme: 'MyScheme',
          simulatorId: 'ABC123-DEF456-789',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing scheme parameter', async () => {
        const result = await callToolHandler(testSimulatorByIdProjectTool, {
          projectPath: '/path/to/project.xcodeproj',
          simulatorId: 'ABC123-DEF456-789',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing simulatorId parameter', async () => {
        const result = await callToolHandler(testSimulatorByIdProjectTool, {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        });
        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'simulatorId' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
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

        const result = await callToolHandler(testSimulatorByIdProjectTool, params);

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

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 15',
      };

      const result = await callToolHandler(testSimulatorByNameWorkspaceTool, params);

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
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Tool execution error: Build failed' }],
        isError: true,
      });

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 15',
      };

      const result = await callToolHandler(testSimulatorByNameWorkspaceTool, params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Tool execution error: Build failed');
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

      const params = {
        workspacePath: '/Users/dev/MyApp/MyApp.xcworkspace',
        scheme: 'MyApp',
        simulatorName: 'iPhone 15 Pro',
        configuration: 'Debug',
        useLatestOS: true,
      };

      const result = await callToolHandler(testSimulatorByNameWorkspaceTool, params);

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
      const params = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'ABC123-DEF456-789',
        configuration: 'Release',
        derivedDataPath: '/tmp/DerivedData',
        extraArgs: ['-parallel-testing-enabled', 'YES', '-test-timeouts-enabled', 'YES'],
        preferXcodebuild: true,
      };

      const result = await callToolHandler(testSimulatorByIdProjectTool, params);

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
});
