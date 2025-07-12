/**
 * Tests for test_sim_id_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../utils/command.js';
import testSimIdProj from './test_sim_id_proj.ts';

describe('test_sim_id_proj plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(testSimIdProj.name).toBe('test_sim_id_proj');
    });

    it('should have correct description field', () => {
      expect(testSimIdProj.description).toBe(
        'Runs tests for a project on a simulator by UUID using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler as a function', () => {
      expect(typeof testSimIdProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(testSimIdProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid simulatorId
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--arg1', '--arg2'],
          useLatestOS: true,
          preferXcodebuild: true,
        }).success,
      ).toBe(true);

      // Invalid configuration
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 123,
        }).success,
      ).toBe(false);

      // Invalid derivedDataPath
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          derivedDataPath: 123,
        }).success,
      ).toBe(false);

      // Invalid extraArgs
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          extraArgs: 'not-array',
        }).success,
      ).toBe(false);

      // Invalid useLatestOS
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          useLatestOS: 'yes',
        }).success,
      ).toBe(false);

      // Invalid preferXcodebuild
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          preferXcodebuild: 'yes',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation error for missing projectPath', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'No project or workspace specified',
      });

      const result = await testSimIdProj.handler(
        {
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ [stderr] No project or workspace specified',
          },
          {
            type: 'text',
            text: '❌ Test Run test failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation error for missing scheme', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'No scheme specified',
      });

      const result = await testSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ [stderr] No scheme specified',
          },
          {
            type: 'text',
            text: '❌ Test Run test failed for scheme undefined.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation error for missing simulatorId', async () => {
      const result = await testSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'For iOS Simulator platform, either simulatorId or simulatorName must be provided',
          },
        ],
        isError: true,
      });
    });

    it('should generate correct xcodebuild test command', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: 'Test session started\nTesting completed successfully',
        error: undefined,
        process: { pid: 12345 },
      });

      await testSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
          configuration: 'Release',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        expect.arrayContaining([
          'xcodebuild',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
        ]),
        'Test Run',
        true,
        undefined,
      );
    });

    it('should return exact successful test response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test session started\nTesting completed successfully',
      });

      const result = await testSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result.content[0].text).toContain('✅');
      expect(result.content[0].text).toContain('Test Run test succeeded');
      expect(result.isError).toBeFalsy();
    });

    it('should return exact test failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'xcodebuild: error: Scheme NotFound not found',
      });

      const result = await testSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'NotFound',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('xcodebuild: error');
      expect(result.isError).toBe(true);
    });

    it('should handle spawn errors', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('spawn xcodebuild ENOENT'));

      const result = await testSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result.content[0].text).toContain(
        'Error during Test Run test: spawn xcodebuild ENOENT',
      );
      expect(result.isError).toBe(true);
    });
  });
});
