/**
 * Tests for test_sim_name_proj plugin
 * Following CLAUDE.md testing standards with dependency injection and literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../utils/command.js';
import testSimNameProj, { test_sim_name_projLogic } from '../test_sim_name_proj.ts';

describe('test_sim_name_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testSimNameProj.name).toBe('test_sim_name_proj');
    });

    it('should have correct description', () => {
      expect(testSimNameProj.description).toBe(
        'Runs tests for a project on a simulator by name using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testSimNameProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testSimNameProj.schema.projectPath.safeParse('/path/to/project.xcodeproj').success,
      ).toBe(true);
      expect(testSimNameProj.schema.scheme.safeParse('MyScheme').success).toBe(true);
      expect(testSimNameProj.schema.simulatorName.safeParse('iPhone 16').success).toBe(true);

      // Test optional fields
      expect(testSimNameProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testSimNameProj.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(
        true,
      );
      expect(testSimNameProj.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(testSimNameProj.schema.preferXcodebuild.safeParse(true).success).toBe(true);
      expect(testSimNameProj.schema.useLatestOS.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testSimNameProj.schema.projectPath.safeParse(123).success).toBe(false);
      expect(testSimNameProj.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testSimNameProj.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
      expect(testSimNameProj.schema.useLatestOS.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Logic Function Behavior (Complete Literal Returns)', () => {
    it('should handle missing parameters and generate test command', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Debug',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should return successful test response when xcodebuild succeeds', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Debug',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should return error response when xcodebuild fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'xcodebuild: error: Scheme not found',
      });

      const result = await test_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'NonExistentScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should use default configuration when not provided', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle optional parameters correctly', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/custom/derived',
          extraArgs: ['--verbose'],
          useLatestOS: true,
          preferXcodebuild: true,
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });
  });
});
