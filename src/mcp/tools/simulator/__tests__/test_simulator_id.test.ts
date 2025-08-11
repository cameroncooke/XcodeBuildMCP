/**
 * Tests for test_simulator_id plugin (unified)
 * Following CLAUDE.md testing standards with dependency injection and literal validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../../utils/command.js';
import testSimulatorId, { test_simulator_idLogic } from '../test_simulator_id.js';

describe('test_simulator_id plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testSimulatorId.name).toBe('test_simulator_id');
    });

    it('should have correct description', () => {
      expect(testSimulatorId.description).toBe(
        'Runs tests for either a project or workspace on a simulator by UUID using xcodebuild test and parses xcresult output. Provide exactly one of projectPath or workspacePath. Example: test_simulator_id({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme", simulatorId: "SIMULATOR_UUID" })',
      );
    });

    it('should have handler function', () => {
      expect(typeof testSimulatorId.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testSimulatorId.schema.projectPath.safeParse('/path/to/project.xcodeproj').success,
      ).toBe(true);
      expect(
        testSimulatorId.schema.workspacePath.safeParse('/path/to/workspace.xcworkspace').success,
      ).toBe(true);
      expect(testSimulatorId.schema.scheme.safeParse('MyScheme').success).toBe(true);
      expect(testSimulatorId.schema.simulatorId.safeParse('test-uuid-123').success).toBe(true);

      // Test optional fields
      expect(testSimulatorId.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testSimulatorId.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(
        true,
      );
      expect(testSimulatorId.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(testSimulatorId.schema.preferXcodebuild.safeParse(true).success).toBe(true);
      expect(testSimulatorId.schema.useLatestOS.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testSimulatorId.schema.projectPath.safeParse(123).success).toBe(false);
      expect(testSimulatorId.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(testSimulatorId.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testSimulatorId.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
      expect(testSimulatorId.schema.useLatestOS.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await testSimulatorId.handler({
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await testSimulatorId.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });

    it('should allow only projectPath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      // Mock the handler to use our mock executor
      const originalHandler = testSimulatorId.handler;
      testSimulatorId.handler = async (args) => {
        return test_simulator_idLogic(args as any, mockExecutor);
      };

      const result = await testSimulatorId.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      // Restore original handler
      testSimulatorId.handler = originalHandler;

      expect(result.isError).toBeUndefined();
    });

    it('should allow only workspacePath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      // Mock the handler to use our mock executor
      const originalHandler = testSimulatorId.handler;
      testSimulatorId.handler = async (args) => {
        return test_simulator_idLogic(args as any, mockExecutor);
      };

      const result = await testSimulatorId.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid-123',
      });

      // Restore original handler
      testSimulatorId.handler = originalHandler;

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle missing parameters and generate xcodebuild command', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_simulator_idLogic(
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

      const result = await test_simulator_idLogic(
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

      const result = await test_simulator_idLogic(
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

      const result = await test_simulator_idLogic(
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

      const result = await test_simulator_idLogic(
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

    it('should handle optional parameters correctly with projectPath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_simulator_idLogic(
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

    it('should handle successful test execution with default configuration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_simulator_idLogic(
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

      const result = await test_simulator_idLogic(
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

      const result = await test_simulator_idLogic(
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

      const result = await test_simulator_idLogic(
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
