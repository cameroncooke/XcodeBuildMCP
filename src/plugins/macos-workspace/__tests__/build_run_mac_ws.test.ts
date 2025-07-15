/**
 * Tests for build_run_mac_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import buildRunMacWs from '../build_run_mac_ws.ts';

describe('build_run_mac_ws plugin', () => {
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
      const calls: any[] = [];
      const mockExecutor = (command: string[]) => {
        calls.push(command);
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
      };

      // Mock exec function through dependency injection
      const mockExecFunction = () => Promise.resolve({ stdout: '', stderr: '' });

      const result = await buildRunMacWs.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        { execFunction: mockExecFunction },
      );

      expect(result.content).toEqual([
        {
          type: 'text',
          text: '✅ macOS Build build succeeded for scheme MyScheme.',
        },
        {
          type: 'text',
          text: 'Next Steps:\n1. Get App Path: get_macos_app_path_workspace\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
        },
        {
          type: 'text',
          text: '✅ macOS build and run succeeded for scheme MyScheme. App launched: /path/to/build/MyApp.app',
        },
      ]);
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
      const calls: any[] = [];
      const mockExecutor = (command: string[]) => {
        calls.push(command);
        return Promise.reject(new Error('Network error'));
      };

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
