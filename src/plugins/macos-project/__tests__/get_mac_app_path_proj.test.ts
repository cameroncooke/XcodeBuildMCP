/**
 * Tests for get_mac_app_path_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createNoopExecutor,
  type CommandExecutor,
} from '../../../utils/command.js';
import tool, { get_mac_app_path_projLogic } from '../get_mac_app_path_proj.js';

describe('get_mac_app_path_proj', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('get_mac_app_path_proj');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe(
        "Gets the app bundle path for a macOS application using a project file. IMPORTANT: Requires projectPath and scheme. Example: get_mac_app_path_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should export a handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const validInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--verbose'],
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should validate schema with minimal valid inputs', () => {
      const validInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should reject invalid projectPath', () => {
      const invalidInput = {
        projectPath: 123,
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid scheme', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 123,
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe('Command Generation and Response Logic', () => {
    it('should successfully get app path for macOS project', async () => {
      // Manual call tracking for command verification
      const calls: any[] = [];
      const mockExecutor: CommandExecutor = async (...args) => {
        calls.push(args);
        return {
          success: true,
          output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await get_mac_app_path_projLogic(args, mockExecutor);

      // Verify command generation with manual call tracking
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyApp',
          '-configuration',
          'Debug',
        ],
        'Get App Path',
        true,
        undefined,
      ]);

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ macOS app path: /path/to/build/MyApp.app' }],
      });
    });

    it('should handle missing required projectPath parameter', async () => {
      const args = {
        scheme: 'MyApp',
      };

      const result = await get_mac_app_path_projLogic(args, createNoopExecutor());

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle missing required scheme parameter', async () => {
      const args = {
        projectPath: '/path/to/project.xcodeproj',
      };

      const result = await get_mac_app_path_projLogic(args, createNoopExecutor());

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'error: Failed to get build settings',
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await get_mac_app_path_projLogic(args, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to get macOS app path\nDetails: error: Failed to get build settings',
          },
        ],
        isError: true,
      });
    });

    it('should handle spawn error', async () => {
      // Manual error throwing for spawn error testing
      const mockExecutor: CommandExecutor = async () => {
        throw new Error('spawn xcodebuild ENOENT');
      };

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await get_mac_app_path_projLogic(args, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to get macOS app path\nDetails: spawn xcodebuild ENOENT',
          },
        ],
        isError: true,
      });
    });

    it('should use default configuration when not provided', async () => {
      // Manual call tracking for command verification
      const calls: any[] = [];
      const mockExecutor: CommandExecutor = async (...args) => {
        calls.push(args);
        return {
          success: true,
          output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      await get_mac_app_path_projLogic(args, mockExecutor);

      // Verify command generation with manual call tracking
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyApp',
          '-configuration',
          'Debug',
        ],
        'Get App Path',
        true,
        undefined,
      ]);
    });

    it('should include optional parameters in command', async () => {
      // Manual call tracking for command verification
      const calls: any[] = [];
      const mockExecutor: CommandExecutor = async (...args) => {
        calls.push(args);
        return {
          success: true,
          output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--verbose'],
      };

      await get_mac_app_path_projLogic(args, mockExecutor);

      // Verify command generation with manual call tracking
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyApp',
          '-configuration',
          'Release',
          '-derivedDataPath',
          '/path/to/derived',
          '--verbose',
        ],
        'Get App Path',
        true,
        undefined,
      ]);
    });

    it('should handle missing build settings in output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'OTHER_SETTING = value',
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await get_mac_app_path_projLogic(args, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to get macOS app path\nDetails: Could not extract app path from build settings',
          },
        ],
        isError: true,
      });
    });
  });
});
