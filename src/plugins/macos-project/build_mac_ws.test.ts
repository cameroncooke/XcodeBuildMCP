/**
 * Tests for build_mac_ws plugin (re-export)
 * Following CLAUDE.md testing standards with literal validation
 * This file tests the re-export from macos-workspace/build_mac_ws.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import buildMacWs from './build_mac_ws.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
}));

describe('build_mac_ws plugin (macos-project re-export)', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildMacWs.name).toBe('build_mac_ws');
    });

    it('should have correct description', () => {
      expect(buildMacWs.description).toBe('Builds a macOS app using xcodebuild from a workspace.');
    });

    it('should have handler function', () => {
      expect(typeof buildMacWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildMacWs.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(buildMacWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildMacWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildMacWs.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildMacWs.schema.arch.safeParse('arm64').success).toBe(true);
      expect(buildMacWs.schema.arch.safeParse('x86_64').success).toBe(true);
      expect(buildMacWs.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildMacWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildMacWs.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(buildMacWs.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildMacWs.schema.arch.safeParse('invalidArch').success).toBe(false);
      expect(buildMacWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildMacWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockLog: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;
    mockLog = utils.log as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful build response', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      // Verify the executeXcodeBuildCommand was called with correct parameters
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
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

    it('should return exact build failure response', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Failed to build: Compilation error in main.swift',
          },
        ],
        isError: true,
      });

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to build: Compilation error in main.swift',
          },
        ],
        isError: true,
      });
    });

    it('should return exact successful build response with optional parameters', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        arch: 'arm64',
        derivedDataPath: '/path/to/derived-data',
        extraArgs: ['--verbose'],
        preferXcodebuild: true,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      // Verify the executeXcodeBuildCommand was called with correct parameters including optional ones
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          arch: 'arm64',
          derivedDataPath: '/path/to/derived-data',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        {
          platform: 'macOS',
          arch: 'arm64',
          logPrefix: 'macOS Build',
        },
        true,
        'build',
      );
    });

    it('should return exact exception handling response', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Error during macOS Build build: Network error',
          },
        ],
        isError: true,
      });

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS Build build: Network error',
          },
        ],
        isError: true,
      });
    });

    it('should handle default configuration and preferXcodebuild values', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        // configuration and preferXcodebuild not provided - should use defaults
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      // Verify defaults are applied
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug', // default value
          preferXcodebuild: false, // default value
        },
        {
          platform: 'macOS',
          arch: undefined,
          logPrefix: 'macOS Build',
        },
        false, // default preferXcodebuild
        'build',
      );
    });

    it('should verify logging is called', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      // Verify that logging was called with the correct message
      expect(mockLog).toHaveBeenCalledWith(
        'info',
        'Starting macOS build for scheme MyScheme (internal)',
      );
    });

    it('should handle null configuration gracefully', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: null, // null should be replaced with default
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      // Verify null configuration is replaced with default
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: 'Debug', // null should become 'Debug'
        }),
        expect.any(Object),
        expect.any(Boolean),
        'build',
      );
    });

    it('should handle null preferXcodebuild gracefully', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      const result = await buildMacWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        preferXcodebuild: null, // null should be replaced with default
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      // Verify null preferXcodebuild is replaced with default
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          preferXcodebuild: false, // null should become false
        }),
        expect.any(Object),
        false, // null should become false
        'build',
      );
    });
  });
});
