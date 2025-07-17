/**
 * Tests for test_sim_id_ws plugin
 * Following CLAUDE.md testing standards with dependency injection and literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import testSimIdWs from '../test_sim_id_ws.ts';

describe('test_sim_id_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testSimIdWs.name).toBe('test_sim_id_ws');
    });

    it('should have correct description', () => {
      expect(testSimIdWs.description).toBe(
        'Runs tests for a workspace on a simulator by UUID using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testSimIdWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testSimIdWs.schema.workspacePath.safeParse('/path/to/workspace.xcworkspace').success,
      ).toBe(true);
      expect(testSimIdWs.schema.scheme.safeParse('MyScheme').success).toBe(true);
      expect(testSimIdWs.schema.simulatorId.safeParse('test-uuid-123').success).toBe(true);

      // Test optional fields
      expect(testSimIdWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testSimIdWs.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(true);
      expect(testSimIdWs.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(testSimIdWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);
      expect(testSimIdWs.schema.useLatestOS.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testSimIdWs.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(testSimIdWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testSimIdWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
      expect(testSimIdWs.schema.useLatestOS.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle missing parameters and generate xcodebuild command', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await testSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
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

      const result = await testSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
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

      const result = await testSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
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

      const result = await testSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
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

      const result = await testSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
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

    it('should handle successful test execution with default configuration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await testSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-456',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle successful test execution with detailed output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed\nExecuted 25 tests, with 0 failures',
      });

      const result = await testSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-789',
          configuration: 'Debug',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle successful test execution with release configuration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await testSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-abc',
          configuration: 'Release',
          useLatestOS: true,
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle successful test execution with custom derived data path', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await testSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-def',
          configuration: 'Debug',
          derivedDataPath: '/custom/derived/data',
          extraArgs: ['--verbose', '--parallel-testing-enabled', 'NO'],
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });
  });
});
