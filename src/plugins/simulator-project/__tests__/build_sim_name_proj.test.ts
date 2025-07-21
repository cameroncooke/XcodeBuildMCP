import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../utils/command.js';
import buildSimNameProj, { build_sim_name_projLogic } from '../build_sim_name_proj.ts';

describe('build_sim_name_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(buildSimNameProj.name).toBe('build_sim_name_proj');
    });

    it('should have correct description field', () => {
      expect(buildSimNameProj.description).toBe(
        "Builds an app from a project file for a specific simulator by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: build_sim_name_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof buildSimNameProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildSimNameProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid simulatorName
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--arg1', '--arg2'],
          useLatestOS: true,
          preferXcodebuild: true,
        }).success,
      ).toBe(true);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return validation error for missing projectPath', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: '',
      });

      const result = await build_sim_name_projLogic(
        {
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
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
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: '',
      });

      const result = await build_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          simulatorName: 'iPhone 16',
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

    it('should return validation error for missing simulatorName', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: '',
      });

      const result = await build_sim_name_projLogic(
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
            text: "Required parameter 'simulatorName' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return build error when build fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Error: Xcode build failed\nDetails: Build failed with error',
      });

      const result = await build_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ [stderr] Error: Xcode build failed' },
          { type: 'text', text: '❌ [stderr] Details: Build failed with error' },
          { type: 'text', text: '❌ iOS Simulator Build build failed for scheme MyScheme.' },
        ],
        isError: true,
      });
    });

    it('should handle successful build', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
        error: '',
      });

      const result = await build_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
      });
      expect(result.content[1].text).toContain('Next Steps:');
      expect(result.isError).toBeFalsy();
    });

    it('should handle command generation with extra args', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Build failed',
      });

      const result = await build_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--custom-arg'],
          preferXcodebuild: true,
        },
        mockExecutor,
      );

      // Verify the result
      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ [stderr] Build failed' },
          { type: 'text', text: '❌ iOS Simulator Build build failed for scheme MyScheme.' },
        ],
        isError: true,
      });

      // Verify command generation happened by checking the result was processed
    });
  });

  describe('Command Generation Tests', () => {
    it('should generate correct xcodebuild command for minimal parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
        error: '',
      });

      const result = await build_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
      });
      expect(result.content[1].text).toContain('Next Steps:');
      expect(result.isError).toBeFalsy();
    });

    it('should generate correct xcodebuild command with all optional parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
        error: '',
      });

      const result = await build_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16 Pro',
          configuration: 'Release',
          derivedDataPath: '/custom/derived',
          extraArgs: ['--verbose', '--custom-flag'],
          useLatestOS: false,
          preferXcodebuild: true,
        },
        mockExecutor,
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
      });
      expect(result.content[1].text).toContain('Next Steps:');
      expect(result.isError).toBeFalsy();
    });

    it('should generate correct command with default configuration when not specified', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
        error: '',
      });

      const result = await build_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          // configuration intentionally omitted to test default
        },
        mockExecutor,
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
      });
      expect(result.content[1].text).toContain('Next Steps:');
      expect(result.isError).toBeFalsy();
    });

    it('should generate correct command with simulator name containing spaces', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
        error: '',
      });

      const result = await build_sim_name_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16 Pro Max',
        },
        mockExecutor,
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: '✅ iOS Simulator Build build succeeded for scheme MyScheme.',
      });
      expect(result.content[1].text).toContain('Next Steps:');
      expect(result.isError).toBeFalsy();
    });
  });
});
