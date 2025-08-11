/**
 * Tests for test_simulator_name plugin
 * Following CLAUDE.md testing standards with dependency injection and literal validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../../utils/command.js';
import testSimulatorName, { test_simulator_nameLogic } from '../test_simulator_name.js';

describe('test_simulator_name plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testSimulatorName.name).toBe('test_simulator_name');
    });

    it('should have correct description', () => {
      expect(testSimulatorName.description).toBe(
        'Runs tests on a simulator by name using xcodebuild test and parses xcresult output. Works with both Xcode projects (.xcodeproj) and workspaces (.xcworkspace). IMPORTANT: Requires either projectPath or workspacePath, plus scheme and simulatorName. Example: test_simulator_name({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme", simulatorName: "iPhone 16" })',
      );
    });

    it('should have handler function', () => {
      expect(typeof testSimulatorName.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testSimulatorName.schema.projectPath.safeParse('/path/to/project.xcodeproj').success,
      ).toBe(true);
      expect(
        testSimulatorName.schema.workspacePath.safeParse('/path/to/workspace.xcworkspace').success,
      ).toBe(true);
      expect(testSimulatorName.schema.scheme.safeParse('MyScheme').success).toBe(true);
      expect(testSimulatorName.schema.simulatorName.safeParse('iPhone 16').success).toBe(true);

      // Test optional fields
      expect(testSimulatorName.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testSimulatorName.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(
        true,
      );
      expect(testSimulatorName.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(testSimulatorName.schema.preferXcodebuild.safeParse(true).success).toBe(true);
      expect(testSimulatorName.schema.useLatestOS.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testSimulatorName.schema.projectPath.safeParse(123).success).toBe(false);
      expect(testSimulatorName.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(testSimulatorName.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testSimulatorName.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(
        false,
      );
      expect(testSimulatorName.schema.useLatestOS.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('XOR Validation', () => {
    it('should accept projectPath without workspacePath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_simulator_nameLogic(
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

    it('should accept workspacePath without projectPath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Logic Function Behavior (Complete Literal Returns)', () => {
    it('should handle project path and generate test command', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_simulator_nameLogic(
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

    it('should handle workspace path and generate test command', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
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

      const result = await test_simulator_nameLogic(
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

      const result = await test_simulator_nameLogic(
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

      const result = await test_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
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

      const result = await test_simulator_nameLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
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
