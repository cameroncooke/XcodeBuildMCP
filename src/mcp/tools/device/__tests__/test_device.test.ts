/**
 * Tests for test_device plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 * NO VITEST MOCKING ALLOWED - Only createMockExecutor and manual stubs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
} from '../../../../test-utils/mock-executors.ts';
import testDevice, { testDeviceLogic } from '../test_device.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('test_device plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testDevice.name).toBe('test_device');
    });

    it('should have correct description', () => {
      expect(testDevice.description).toBe('Runs tests on a physical Apple device.');
    });

    it('should have handler function', () => {
      expect(typeof testDevice.handler).toBe('function');
    });

    it('should expose only session-free fields in public schema', () => {
      const schema = z.object(testDevice.schema).strict();
      expect(
        schema.safeParse({
          derivedDataPath: '/path/to/derived-data',
          extraArgs: ['--arg1'],
          preferXcodebuild: true,
          platform: 'iOS',
          testRunnerEnv: { FOO: 'bar' },
        }).success,
      ).toBe(true);
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ projectPath: '/path/to/project.xcodeproj' }).success).toBe(false);

      const schemaKeys = Object.keys(testDevice.schema).sort();
      expect(schemaKeys).toEqual([
        'derivedDataPath',
        'extraArgs',
        'platform',
        'preferXcodebuild',
        'testRunnerEnv',
      ]);
    });

    it('should validate XOR between projectPath and workspacePath', async () => {
      // This would be validated at the schema level via createTypedTool
      // We test the schema validation through successful logic calls instead
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'Test Schema',
          result: 'SUCCESS',
          totalTestCount: 1,
          passedTests: 1,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });

      // Valid: project path only
      const projectResult = await testDeviceLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );
      expect(projectResult.isError).toBeFalsy();

      // Valid: workspace path only
      const workspaceResult = await testDeviceLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-456',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );
      expect(workspaceResult.isError).toBeFalsy();
    });
  });

  describe('Handler Requirements', () => {
    it('should require scheme and device defaults', async () => {
      const result = await testDevice.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide scheme and deviceId');
    });

    it('should require project or workspace when defaults provide scheme and device', async () => {
      sessionStore.setDefaults({ scheme: 'MyScheme', deviceId: 'test-device-123' });

      const result = await testDevice.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should reject mutually exclusive project inputs when defaults satisfy requirements', async () => {
      sessionStore.setDefaults({ scheme: 'MyScheme', deviceId: 'test-device-123' });

      const result = await testDevice.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    beforeEach(() => {
      // Clean setup for standard testing pattern
    });

    it('should return successful test response with parsed results', async () => {
      // Mock xcresulttool output
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'MyScheme Tests',
          result: 'SUCCESS',
          totalTestCount: 5,
          passedTests: 5,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });

      const result = await testDeviceLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'iOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123456',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('✅');
      expect(result.content[1].text).toContain('Test Results Summary:');
      expect(result.content[1].text).toContain('MyScheme Tests');
    });

    it('should handle test failure scenarios', async () => {
      // Mock xcresulttool output for failed tests
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'MyScheme Tests',
          result: 'FAILURE',
          totalTestCount: 5,
          passedTests: 3,
          failedTests: 2,
          skippedTests: 0,
          expectedFailures: 0,
          testFailures: [
            {
              testName: 'testExample',
              targetName: 'MyTarget',
              failureText: 'Expected true but was false',
            },
          ],
        }),
      });

      const result = await testDeviceLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'iOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123456',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[1].text).toContain('Test Failures:');
      expect(result.content[1].text).toContain('testExample');
    });

    it('should handle xcresult parsing failures gracefully', async () => {
      // Create a multi-call mock that handles different commands
      let callCount = 0;
      const mockExecutor = async (args: string[], description: string) => {
        callCount++;

        // First call is for xcodebuild test (successful)
        if (callCount === 1) {
          return { success: true, output: 'BUILD SUCCEEDED' };
        }

        // Second call is for xcresulttool (fails)
        return { success: false, error: 'xcresulttool failed' };
      };

      const result = await testDeviceLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'iOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123456',
          tmpdir: () => '/tmp',
          stat: async () => {
            throw new Error('File not found');
          },
          rm: async () => {},
        }),
      );

      // When xcresult parsing fails, it falls back to original test result only
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('✅');
    });

    it('should support different platforms', async () => {
      // Mock xcresulttool output
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'WatchApp Tests',
          result: 'SUCCESS',
          totalTestCount: 3,
          passedTests: 3,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });

      const result = await testDeviceLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'WatchApp',
          deviceId: 'watch-device-456',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'watchOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123456',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[1].text).toContain('WatchApp Tests');
    });

    it('should handle optional parameters', async () => {
      // Mock xcresulttool output
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'Tests',
          result: 'SUCCESS',
          totalTestCount: 1,
          passedTests: 1,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });

      const result = await testDeviceLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Release',
          derivedDataPath: '/tmp/derived-data',
          extraArgs: ['--verbose'],
          preferXcodebuild: false,
          platform: 'iOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123456',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('✅');
    });

    it('should handle workspace testing successfully', async () => {
      // Mock xcresulttool output
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'WorkspaceScheme Tests',
          result: 'SUCCESS',
          totalTestCount: 10,
          passedTests: 10,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });

      const result = await testDeviceLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'WorkspaceScheme',
          deviceId: 'test-device-456',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'iOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-workspace-123',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('✅');
      expect(result.content[1].text).toContain('Test Results Summary:');
      expect(result.content[1].text).toContain('WorkspaceScheme Tests');
    });
  });
});
