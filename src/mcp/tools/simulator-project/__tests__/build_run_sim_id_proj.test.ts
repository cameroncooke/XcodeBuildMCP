/**
 * Tests for build_run_sim_id_proj plugin
 * Following CLAUDE.md testing standards with strict dependency injection
 * NO VITEST MOCKING ALLOWED - Only createMockExecutor for CommandExecutor
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../utils/command.js';
import buildRunSimIdProj, { build_run_sim_id_projLogic } from '../build_run_sim_id_proj.ts';

describe('build_run_sim_id_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(buildRunSimIdProj.name).toBe('build_run_sim_id_proj');
    });

    it('should have correct description field', () => {
      expect(buildRunSimIdProj.description).toBe(
        "Builds and runs an app from a project file on a simulator specified by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: build_run_sim_id_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof buildRunSimIdProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildRunSimIdProj.schema);

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

      // Missing required fields
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Parameter Validation', () => {
    it('should return validation error for missing projectPath', async () => {
      const mockExecutor = createMockExecutor({});

      const result = await build_run_sim_id_projLogic(
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
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return validation error for missing scheme', async () => {
      const mockExecutor = createMockExecutor({});

      const result = await build_run_sim_id_projLogic(
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
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return validation error for missing simulatorId', async () => {
      const mockExecutor = createMockExecutor({});

      const result = await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });
  });

  describe('Build Failure Handling', () => {
    it('should return build error when xcodebuild fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed with errors',
      });

      const result = await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Build failed with errors');
    });
  });

  describe('Success Cases', () => {
    it('should handle successful build with minimal configuration', async () => {
      // Mock all the commands that the function makes using dependency injection
      const mockExecutor = async (command: string[]) => {
        const cmdStr = command.join(' ');

        // Build command - xcodebuild build
        if (command.includes('build')) {
          return { success: true, output: 'Build succeeded' };
        }

        // ShowBuildSettings command
        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output:
              'CODESIGNING_FOLDER_PATH = /path/to/Build/Products/Debug-iphonesimulator/MyApp.app',
          };
        }

        // Simulator list command
        if (command.includes('simctl') && command.includes('list')) {
          return {
            success: true,
            output: '    Test Simulator (test-uuid) (Booted)',
          };
        }

        // Install command
        if (command.includes('install')) {
          return { success: true, output: 'App installed' };
        }

        // Get bundle ID command
        if (cmdStr.includes('PlistBuddy') || cmdStr.includes('defaults')) {
          return { success: true, output: 'com.example.MyApp' };
        }

        // Launch command
        if (command.includes('launch')) {
          return { success: true, output: 'App launched' };
        }

        // Open Simulator app
        if (command.includes('open') && command.includes('Simulator')) {
          return { success: true, output: '' };
        }

        // Default success for any other commands
        return { success: true, output: '' };
      };

      const result = await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅ iOS simulator build and run succeeded');
      expect(result.content[0].text).toContain('MyScheme');
      expect(result.content[0].text).toContain('test-uuid');
    });
  });
});
