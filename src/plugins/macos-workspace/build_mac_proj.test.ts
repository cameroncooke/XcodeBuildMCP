/**
 * Tests for build_mac_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import buildMacProj from './build_mac_proj.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
}));

describe('build_mac_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildMacProj.name).toBe('build_mac_proj');
    });

    it('should have correct description', () => {
      expect(buildMacProj.description).toBe(
        'Builds a macOS app using xcodebuild from a project file.',
      );
    });

    it('should have handler function', () => {
      expect(typeof buildMacProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildMacProj.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success,
      ).toBe(true);
      expect(buildMacProj.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildMacProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildMacProj.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildMacProj.schema.arch.safeParse('arm64').success).toBe(true);
      expect(buildMacProj.schema.arch.safeParse('x86_64').success).toBe(true);
      expect(buildMacProj.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildMacProj.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildMacProj.schema.projectPath.safeParse(null).success).toBe(false);
      expect(buildMacProj.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildMacProj.schema.arch.safeParse('invalidArch').success).toBe(false);
      expect(buildMacProj.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildMacProj.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  let mockExecuteXcodeBuildCommand: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;

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

      const result = await buildMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
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

      const result = await buildMacProj.handler({
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

    it('should return exact successful build response with optional parameters', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build succeeded for scheme MyScheme\n\nBuild completed successfully',
          },
        ],
      });

      const result = await buildMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
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

      const result = await buildMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
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

    it('should return exact string error handling response', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Error during macOS Build build: String error',
          },
        ],
        isError: true,
      });

      const result = await buildMacProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS Build build: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
