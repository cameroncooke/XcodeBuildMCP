import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import tool from './build_run_mac_ws.ts';
import {
  executeXcodeBuildCommand,
  executeCommand,
  log,
  createTextResponse,
} from '../../utils/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { MockedFunction } from 'vitest';

// Mock the utility functions
vi.mock('../../src/utils/index.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
  executeCommand: vi.fn(),
  log: vi.fn(),
  createTextResponse: vi.fn(),
}));

// Mock Node.js modules
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(),
}));

const mockExecuteXcodeBuildCommand = executeXcodeBuildCommand as MockedFunction<
  typeof executeXcodeBuildCommand
>;
const mockExecuteCommand = executeCommand as MockedFunction<typeof executeCommand>;
const mockLog = log as MockedFunction<typeof log>;
const mockCreateTextResponse = createTextResponse as MockedFunction<typeof createTextResponse>;
const mockExec = exec as MockedFunction<typeof exec>;
const mockPromisify = promisify as MockedFunction<typeof promisify>;

describe('build_run_mac_ws', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('build_run_mac_ws');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe('Builds and runs a macOS app from a workspace in one step.');
    });

    it('should export a handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const validInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
        configuration: 'Debug',
        derivedDataPath: '/path/to/derived',
        arch: 'arm64',
        extraArgs: ['--verbose'],
        preferXcodebuild: true,
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should validate schema with minimal valid inputs', () => {
      const validInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should reject invalid workspacePath', () => {
      const invalidInput = {
        workspacePath: 123,
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid scheme', () => {
      const invalidInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 123,
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid arch', () => {
      const invalidInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
        arch: 'invalid',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid extraArgs', () => {
      const invalidInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
        extraArgs: 'not-array',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid preferXcodebuild', () => {
      const invalidInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
        preferXcodebuild: 'yes',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful build and run', async () => {
      // Mock successful build
      const mockBuildResult = {
        content: [
          {
            type: 'text',
            text: 'Build successful for scheme MyApp',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockBuildResult);

      // Mock successful build settings extraction
      const mockBuildSettingsResult = {
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build/Debug\nFULL_PRODUCT_NAME = MyApp.app',
      };
      mockExecuteCommand.mockResolvedValue(mockBuildSettingsResult);

      // Mock successful app launch
      const mockOpen = vi.fn().mockResolvedValue(undefined);
      mockPromisify.mockReturnValue(mockOpen);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith('info', 'Handling macOS build & run logic...');
      expect(mockLog).toHaveBeenCalledWith(
        'info',
        'Starting macOS build for scheme MyApp (internal)',
      );
      expect(mockLog).toHaveBeenCalledWith(
        'info',
        'App path determined as: /path/to/build/Debug/MyApp.app',
      );
      expect(mockLog).toHaveBeenCalledWith(
        'info',
        '✅ macOS app launched successfully: /path/to/build/Debug/MyApp.app',
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build successful for scheme MyApp',
          },
          {
            type: 'text',
            text: '✅ macOS build and run succeeded for scheme MyApp. App launched: /path/to/build/Debug/MyApp.app',
          },
        ],
      });
    });

    it('should handle build failure', async () => {
      // Mock failed build
      const mockBuildResult = {
        content: [
          {
            type: 'text',
            text: 'Build failed: Compilation error',
          },
        ],
        isError: true,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockBuildResult);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build failed: Compilation error',
          },
        ],
        isError: true,
      });
    });

    it('should handle app path extraction failure', async () => {
      // Mock successful build
      const mockBuildResult = {
        content: [
          {
            type: 'text',
            text: 'Build successful for scheme MyApp',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockBuildResult);

      // Mock failed build settings extraction
      const mockBuildSettingsResult = {
        success: false,
        error: 'Failed to extract build settings',
      };
      mockExecuteCommand.mockResolvedValue(mockBuildSettingsResult);

      const mockTextResponse = {
        content: [
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to get app path to launch: Failed to extract build settings',
          },
        ],
        isError: false,
      };
      mockCreateTextResponse.mockReturnValue(mockTextResponse);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith(
        'error',
        'Build succeeded, but failed to get app path to launch.',
      );
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        '✅ Build succeeded, but failed to get app path to launch: Failed to extract build settings',
        false,
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build successful for scheme MyApp',
          },
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to get app path to launch: Failed to extract build settings',
          },
        ],
        isError: false,
      });
    });

    it('should handle app launch failure', async () => {
      // Mock successful build
      const mockBuildResult = {
        content: [
          {
            type: 'text',
            text: 'Build successful for scheme MyApp',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockBuildResult);

      // Mock successful build settings extraction
      const mockBuildSettingsResult = {
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build/Debug\nFULL_PRODUCT_NAME = MyApp.app',
      };
      mockExecuteCommand.mockResolvedValue(mockBuildSettingsResult);

      // Mock failed app launch
      const mockOpen = vi.fn().mockRejectedValue(new Error('App launch failed'));
      mockPromisify.mockReturnValue(mockOpen);

      const mockTextResponse = {
        content: [
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to launch app /path/to/build/Debug/MyApp.app. Error: App launch failed',
          },
        ],
        isError: false,
      };
      mockCreateTextResponse.mockReturnValue(mockTextResponse);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith(
        'error',
        'Build succeeded, but failed to launch app /path/to/build/Debug/MyApp.app: App launch failed',
      );
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        '✅ Build succeeded, but failed to launch app /path/to/build/Debug/MyApp.app. Error: App launch failed',
        false,
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build successful for scheme MyApp',
          },
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to launch app /path/to/build/Debug/MyApp.app. Error: App launch failed',
          },
        ],
        isError: false,
      });
    });

    it('should handle exception during build and run', async () => {
      // Mock build to throw an exception
      const error = new Error('Unexpected error');
      mockExecuteXcodeBuildCommand.mockRejectedValue(error);

      const mockErrorResponse = {
        content: [
          {
            type: 'text',
            text: 'Error during macOS build and run: Unexpected error',
          },
        ],
        isError: true,
      };
      mockCreateTextResponse.mockReturnValue(mockErrorResponse);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith(
        'error',
        'Error during macOS build & run logic: Unexpected error',
      );
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error during macOS build and run: Unexpected error',
        true,
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS build and run: Unexpected error',
          },
        ],
        isError: true,
      });
    });

    it('should use default configuration when not provided', async () => {
      // Mock successful build
      const mockBuildResult = {
        content: [
          {
            type: 'text',
            text: 'Build successful for scheme MyApp',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockBuildResult);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      await tool.handler(args);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyApp',
          configuration: 'Debug',
          preferXcodebuild: false,
        },
        {
          platform: 'macOS',
          arch: undefined,
          logPrefix: 'macOS Build',
        },
        false,
        'build',
      );
    });

    it('should use custom configuration and arch', async () => {
      // Mock successful build
      const mockBuildResult = {
        content: [
          {
            type: 'text',
            text: 'Build successful for scheme MyApp',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockBuildResult);

      // Mock successful build settings extraction
      const mockBuildSettingsResult = {
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build/Release\nFULL_PRODUCT_NAME = MyApp.app',
      };
      mockExecuteCommand.mockResolvedValue(mockBuildSettingsResult);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
        configuration: 'Release',
        arch: 'x86_64',
        preferXcodebuild: true,
      };

      await tool.handler(args);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyApp',
          configuration: 'Release',
          arch: 'x86_64',
          preferXcodebuild: true,
        },
        {
          platform: 'macOS',
          arch: 'x86_64',
          logPrefix: 'macOS Build',
        },
        true,
        'build',
      );
    });
  });
});
