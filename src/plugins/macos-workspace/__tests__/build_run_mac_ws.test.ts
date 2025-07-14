/**
 * Tests for build_run_mac_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock child_process and util at module level
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(),
}));

import buildRunMacWs from '../build_run_mac_ws.ts';

describe('build_run_mac_ws plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildRunMacWs.name).toBe('build_run_mac_ws');
    });

    it('should have correct description', () => {
      expect(buildRunMacWs.description).toBe(
        'Builds and runs a macOS app from a workspace in one step.',
      );
    });

    it('should have handler function', () => {
      expect(typeof buildRunMacWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildRunMacWs.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(buildRunMacWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildRunMacWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildRunMacWs.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildRunMacWs.schema.arch.safeParse('arm64').success).toBe(true);
      expect(buildRunMacWs.schema.arch.safeParse('x86_64').success).toBe(true);
      expect(buildRunMacWs.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildRunMacWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildRunMacWs.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(buildRunMacWs.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildRunMacWs.schema.arch.safeParse('invalidArch').success).toBe(false);
      expect(buildRunMacWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildRunMacWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should successfully build and run macOS app', async () => {
      // Mock successful build first, then successful build settings
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call for build
          return Promise.resolve({
            success: true,
            output: 'BUILD SUCCEEDED',
            error: '',
          });
        } else {
          // Second call for build settings
          return Promise.resolve({
            success: true,
            output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
            error: '',
          });
        }
      });

      // Mock promisify(exec) to return successful launch
      const mockExecPromise = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      vi.mocked(promisify).mockReturnValue(mockExecPromise);

      const result = await buildRunMacWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.stringContaining('✅ macOS build and run succeeded for scheme MyScheme'),
          }),
        ]),
      );
    });

    it('should return exact build failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'error: Compilation error in main.swift',
      });

      const result = await buildRunMacWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ [stderr] error: Compilation error in main.swift',
          },
          {
            type: 'text',
            text: '❌ macOS Build build failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await buildRunMacWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

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
  });
});
