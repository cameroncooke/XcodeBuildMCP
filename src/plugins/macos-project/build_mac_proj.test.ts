import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import tool from './build_mac_proj.ts';
import { executeXcodeBuildCommand, log } from '../../utils/index.js';
import type { MockedFunction } from 'vitest';

// Mock the utility functions
vi.mock('../../src/utils/index.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
  log: vi.fn(),
}));

const mockExecuteXcodeBuildCommand = executeXcodeBuildCommand as MockedFunction<
  typeof executeXcodeBuildCommand
>;
const mockLog = log as MockedFunction<typeof log>;

describe('build_mac_proj', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('build_mac_proj');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe('Builds a macOS app using xcodebuild from a project file.');
    });

    it('should export a handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const validInput = {
        projectPath: '/path/to/project.xcodeproj',
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
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should reject invalid projectPath', () => {
      const invalidInput = {
        projectPath: 123,
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid scheme', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 123,
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid arch', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        arch: 'invalid',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid extraArgs', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        extraArgs: 'not-array',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid preferXcodebuild', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        preferXcodebuild: 'yes',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful build', async () => {
      const mockResult = {
        content: [
          {
            type: 'text',
            text: 'macOS build completed successfully for scheme MyApp',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockResult);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Release',
        arch: 'arm64',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith(
        'info',
        'Starting macOS build for scheme MyApp (internal)',
      );
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyApp',
          configuration: 'Release',
          arch: 'arm64',
          preferXcodebuild: false,
        },
        {
          platform: 'macOS',
          arch: 'arm64',
          logPrefix: 'macOS Build',
        },
        false,
        'build',
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'macOS build completed successfully for scheme MyApp',
          },
        ],
        isError: false,
      });
    });

    it('should handle build failure', async () => {
      const mockResult = {
        content: [
          {
            type: 'text',
            text: 'Build failed: Compilation error in main.swift',
          },
        ],
        isError: true,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockResult);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build failed: Compilation error in main.swift',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception during build', async () => {
      const error = new Error('Network connection failed');
      mockExecuteXcodeBuildCommand.mockRejectedValue(error);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      await expect(tool.handler(args)).rejects.toThrow('Network connection failed');
    });

    it('should use default configuration when not provided', async () => {
      const mockResult = {
        content: [
          {
            type: 'text',
            text: 'macOS build completed successfully for scheme MyApp',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockResult);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      await tool.handler(args);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/project.xcodeproj',
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

    it('should use preferXcodebuild when provided', async () => {
      const mockResult = {
        content: [
          {
            type: 'text',
            text: 'macOS build completed successfully for scheme MyApp',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockResult);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        preferXcodebuild: true,
      };

      await tool.handler(args);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyApp',
          configuration: 'Debug',
          preferXcodebuild: true,
        },
        {
          platform: 'macOS',
          arch: undefined,
          logPrefix: 'macOS Build',
        },
        true,
        'build',
      );
    });
  });
});
