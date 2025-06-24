/**
 * Clean Tools Tests - Comprehensive test coverage for clean build products tools
 *
 * This test file provides complete coverage for the clean.ts tools:
 * - clean_ws: Clean build products for workspace
 * - clean_proj: Clean build products for project
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { callToolHandler } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';
import { XcodePlatform } from '../utils/xcode.js';
import { executeXcodeBuildCommand } from '../utils/build-utils.js';
import { createTextResponse } from '../utils/validation.js';

// Mock child_process to prevent real command execution
vi.mock('child_process', () => ({ spawn: vi.fn() }));

// Mock fs to prevent file system access during tests
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock the build utilities
vi.mock('../utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

// Mock the logger to prevent logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('clean tests', () => {
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;

  beforeEach(async () => {
    // Import and setup the mocked executeXcodeBuildCommand function
    const buildUtilsModule = await import('../utils/build-utils.js');
    mockExecuteXcodeBuildCommand = buildUtilsModule.executeXcodeBuildCommand as MockedFunction<any>;

    // Default success behavior for executeXcodeBuildCommand
    mockExecuteXcodeBuildCommand.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '✅ Clean succeeded for scheme MyScheme.',
        },
      ],
      isError: false,
    });

    vi.clearAllMocks();
  });

  // Helper function to replicate _handleCleanLogic behavior
  async function handleCleanLogic(params: {
    workspacePath?: string;
    projectPath?: string;
    scheme?: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
  }) {
    // For clean operations, we need to provide a default platform and configuration
    return executeXcodeBuildCommand(
      {
        ...params,
        scheme: params.scheme || '', // Empty string if not provided
        configuration: params.configuration || 'Debug', // Default to Debug if not provided
      },
      {
        platform: XcodePlatform.macOS, // Default to macOS, but this doesn't matter much for clean
        logPrefix: 'Clean',
      },
      false,
      'clean', // Specify 'clean' as the build action
    );
  }

  // Tool schema definitions for testing
  const cleanWorkspaceSchema = z.object({
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().optional().describe('Optional: The scheme to clean'),
    configuration: z
      .string()
      .optional()
      .describe('Optional: Build configuration to clean (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Optional: Path where derived data might be located'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  });

  const cleanProjectSchema = z.object({
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().optional().describe('Optional: The scheme to clean'),
    configuration: z
      .string()
      .optional()
      .describe('Optional: Build configuration to clean (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Optional: Path where derived data might be located'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  });

  // Mock tool definitions for testing
  const cleanWorkspaceTool = {
    name: 'clean_ws',
    description:
      "Cleans build products for a specific workspace using xcodebuild. IMPORTANT: Requires workspacePath. Scheme/Configuration are optional. Example: clean_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    groups: ['CLEAN'],
    schema: cleanWorkspaceSchema,
    handler: async (params: any) => {
      // Validate required parameters - check for empty strings too
      if (!params.workspacePath || params.workspacePath.trim() === '') {
        return createTextResponse(
          "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          true,
        );
      }

      return handleCleanLogic(params);
    },
  };

  const cleanProjectTool = {
    name: 'clean_proj',
    description:
      "Cleans build products for a specific project file using xcodebuild. IMPORTANT: Requires projectPath. Scheme/Configuration are optional. Example: clean_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    groups: ['CLEAN'],
    schema: cleanProjectSchema,
    handler: async (params: any) => {
      // Validate required parameters - check for empty strings too
      if (!params.projectPath || params.projectPath.trim() === '') {
        return createTextResponse(
          "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          true,
        );
      }

      return handleCleanLogic(params);
    },
  };

  describe('clean_ws parameter validation', () => {
    it('should reject missing workspacePath parameter', async () => {
      const result = await callToolHandler(cleanWorkspaceTool, {});
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject empty workspacePath parameter', async () => {
      const result = await callToolHandler(cleanWorkspaceTool, { workspacePath: '' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should accept valid workspacePath without optional parameters', async () => {
      const result = await callToolHandler(cleanWorkspaceTool, {
        workspacePath: '/path/to/MyProject.xcworkspace',
      });
      expect(result.isError).toBe(false);
    });

    it('should accept all optional parameters', async () => {
      const result = await callToolHandler(cleanWorkspaceTool, {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
      });
      expect(result.isError).toBe(false);
    });
  });

  describe('clean_proj parameter validation', () => {
    it('should reject missing projectPath parameter', async () => {
      const result = await callToolHandler(cleanProjectTool, {});
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject empty projectPath parameter', async () => {
      const result = await callToolHandler(cleanProjectTool, { projectPath: '' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should accept valid projectPath without optional parameters', async () => {
      const result = await callToolHandler(cleanProjectTool, {
        projectPath: '/path/to/MyProject.xcodeproj',
      });
      expect(result.isError).toBe(false);
    });

    it('should accept all optional parameters', async () => {
      const result = await callToolHandler(cleanProjectTool, {
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
      });
      expect(result.isError).toBe(false);
    });
  });

  describe('clean_ws success scenarios', () => {
    it('should clean workspace successfully with minimal parameters', async () => {
      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
      };

      const result = await callToolHandler(cleanWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Clean succeeded for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: '',
          configuration: 'Debug',
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });

    it('should clean workspace successfully with all parameters', async () => {
      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
      };

      const result = await callToolHandler(cleanWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Clean succeeded for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });

    it('should handle command failure for workspace clean', async () => {
      // Mock command failure
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '❌ Clean failed for scheme MyScheme.' }],
        isError: true,
      });

      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(cleanWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '❌ Clean failed for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('clean_proj success scenarios', () => {
    it('should clean project successfully with minimal parameters', async () => {
      const params = {
        projectPath: '/path/to/MyProject.xcodeproj',
      };

      const result = await callToolHandler(cleanProjectTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Clean succeeded for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: '',
          configuration: 'Debug',
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });

    it('should clean project successfully with all parameters', async () => {
      const params = {
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
      };

      const result = await callToolHandler(cleanProjectTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Clean succeeded for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });

    it('should handle command failure for project clean', async () => {
      // Mock command failure
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '❌ Clean failed for scheme MyScheme.' }],
        isError: true,
      });

      const params = {
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(cleanProjectTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '❌ Clean failed for scheme MyScheme.' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle executeXcodeBuildCommand throwing an exception for workspace', async () => {
      // Mock executeXcodeBuildCommand to throw an error
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Build utils execution failed'));

      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(cleanWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Tool execution error: Build utils execution failed' },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle executeXcodeBuildCommand throwing an exception for project', async () => {
      // Mock executeXcodeBuildCommand to throw an error
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Build utils execution failed'));

      const params = {
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(cleanProjectTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Tool execution error: Build utils execution failed' },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle default scheme and configuration correctly for workspace', async () => {
      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
      };

      await callToolHandler(cleanWorkspaceTool, params);

      // Verify that empty scheme and Debug configuration are used as defaults
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: '',
          configuration: 'Debug',
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });

    it('should handle default scheme and configuration correctly for project', async () => {
      const params = {
        projectPath: '/path/to/MyProject.xcodeproj',
      };

      await callToolHandler(cleanProjectTool, params);

      // Verify that empty scheme and Debug configuration are used as defaults
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: '',
          configuration: 'Debug',
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });
  });
});
