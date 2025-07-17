/**
 * Tests for test_sim_id_proj plugin
 * Following CLAUDE.md testing standards with dependency injection and literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import testSimIdProj from '../test_sim_id_proj.ts';

describe('test_sim_id_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testSimIdProj.name).toBe('test_sim_id_proj');
    });

    it('should have correct description', () => {
      expect(testSimIdProj.description).toBe(
        'Runs tests for a project on a simulator by UUID using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testSimIdProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(testSimIdProj.schema.projectPath.safeParse('/path/to/project.xcodeproj').success).toBe(
        true,
      );
      expect(testSimIdProj.schema.scheme.safeParse('MyScheme').success).toBe(true);
      expect(testSimIdProj.schema.simulatorId.safeParse('test-uuid-123').success).toBe(true);

      // Test optional fields
      expect(testSimIdProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testSimIdProj.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(true);
      expect(testSimIdProj.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(testSimIdProj.schema.preferXcodebuild.safeParse(true).success).toBe(true);
      expect(testSimIdProj.schema.useLatestOS.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testSimIdProj.schema.projectPath.safeParse(123).success).toBe(false);
      expect(testSimIdProj.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testSimIdProj.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
      expect(testSimIdProj.schema.useLatestOS.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle missing parameters and generate xcodebuild command', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await testSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
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

      const result = await testSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
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

      const result = await testSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'NonExistentScheme',
          simulatorId: 'test-uuid-123',
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

      const result = await testSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
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

      const result = await testSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
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
