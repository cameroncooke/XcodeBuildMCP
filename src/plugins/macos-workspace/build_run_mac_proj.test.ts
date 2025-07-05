/**
 * Tests for build_run_mac_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import buildRunMacProj from './build_run_mac_proj.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeCommand: vi.fn(),
  createTextResponse: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(),
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

describe('build_run_mac_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildRunMacProj.name).toBe('build_run_mac_proj');
    });

    it('should have correct description', () => {
      expect(buildRunMacProj.description).toBe(
        'Builds and runs a macOS app from a project file in one step.',
      );
    });

    it('should have handler function', () => {
      expect(typeof buildRunMacProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildRunMacProj.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success,
      ).toBe(true);
      expect(buildRunMacProj.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildRunMacProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(
        buildRunMacProj.schema.derivedDataPath.safeParse('/path/to/derived-data').success,
      ).toBe(true);
      expect(buildRunMacProj.schema.arch.safeParse('arm64').success).toBe(true);
      expect(buildRunMacProj.schema.arch.safeParse('x86_64').success).toBe(true);
      expect(buildRunMacProj.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildRunMacProj.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildRunMacProj.schema.projectPath.safeParse(null).success).toBe(false);
      expect(buildRunMacProj.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildRunMacProj.schema.arch.safeParse('invalidArch').success).toBe(false);
      expect(buildRunMacProj.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildRunMacProj.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockExecuteCommand: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockPromisify: MockedFunction<any>;
  let mockExecPromise: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    const utilModule = await import('util');

    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;
    mockPromisify = utilModule.promisify as MockedFunction<any>;

    // Create a mock function for the promisified exec
    mockExecPromise = vi.fn();
    mockPromisify.mockReturnValue(mockExecPromise);

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful build and run response', async () => {
      // Mock successful build
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      // Mock successful build settings extraction
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output:
          'Build settings for action build and target MyApp:\n    BUILT_PRODUCTS_DIR = /path/to/build/Debug\n    FULL_PRODUCT_NAME = MyApp.app',
      });

      // Mock successful app launch
      mockExecPromise.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await buildRunMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
          {
            type: 'text',
            text: '✅ macOS build and run succeeded for scheme MyScheme. App launched: /path/to/build/Debug/MyApp.app',
          },
        ],
      });
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

      const result = await buildRunMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
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

    it('should return exact build settings extraction failure response', async () => {
      // Mock successful build
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      // Mock failed build settings extraction
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Could not extract app path from build settings',
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to get app path to launch: Could not extract app path from build settings',
          },
        ],
      });

      const result = await buildRunMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to get app path to launch: Could not extract app path from build settings',
          },
        ],
      });
    });

    it('should return exact app launch failure response', async () => {
      // Mock successful build
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      // Mock successful build settings extraction
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output:
          'Build settings for action build and target MyApp:\n    BUILT_PRODUCTS_DIR = /path/to/build/Debug\n    FULL_PRODUCT_NAME = MyApp.app',
      });

      // Mock failed app launch
      mockExecPromise.mockRejectedValue(new Error('No such file or directory'));

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to launch app /path/to/build/Debug/MyApp.app. Error: No such file or directory',
          },
        ],
      });

      const result = await buildRunMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
          {
            type: 'text',
            text: '✅ Build succeeded, but failed to launch app /path/to/build/Debug/MyApp.app. Error: No such file or directory',
          },
        ],
      });
    });

    it('should return exact exception handling response', async () => {
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Network error'));

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error during macOS build and run: Network error',
          },
        ],
        isError: true,
      });

      const result = await buildRunMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS build and run: Network error',
          },
        ],
        isError: true,
      });
    });

    it('should return exact string error handling response', async () => {
      mockExecuteXcodeBuildCommand.mockRejectedValue('String error');

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error during macOS build and run: String error',
          },
        ],
        isError: true,
      });

      const result = await buildRunMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS build and run: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
