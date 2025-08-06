import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../../utils/command.js';
import buildSimIdProj, { build_sim_id_projLogic } from '../build_sim_id_proj.ts';

describe('build_sim_id_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(buildSimIdProj.name).toBe('build_sim_id_proj');
    });

    it('should have correct description field', () => {
      expect(buildSimIdProj.description).toBe(
        "Builds an app from a project file for a specific simulator by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: build_sim_id_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof buildSimIdProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildSimIdProj.schema);

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
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return Zod validation error for missing projectPath via handler', async () => {
      const result = await buildSimIdProj.handler({
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nprojectPath: Required',
          },
        ],
        isError: true,
      });
    });

    it('should return Zod validation error for missing scheme via handler', async () => {
      const result = await buildSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nscheme: Required',
          },
        ],
        isError: true,
      });
    });

    it('should return Zod validation error for missing simulatorId via handler', async () => {
      const result = await buildSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nsimulatorId: Required',
          },
        ],
        isError: true,
      });
    });

    it('should pass validation when all required parameters are provided', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
        error: undefined,
      });

      const result = await build_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      // Should not be a validation error
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('✅ iOS Simulator Build build succeeded');
    });

    // Note: build_sim_id_projLogic now assumes valid parameters since
    // validation is handled by createTypedTool wrapper using Zod schema

    it('should return build error when build fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed with error',
        output: '',
      });

      const result = await build_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ [stderr] Build failed with error' },
          { type: 'text', text: '❌ iOS Simulator Build build failed for scheme MyScheme.' },
        ],
        isError: true,
      });
    });

    it('should handle successful build', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
        error: undefined,
      });

      const result = await build_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('✅ iOS Simulator Build build succeeded');
      expect(result.content[1].text).toContain('Next Steps:');
    });

    it('should handle command generation with extra args', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed',
        output: '',
      });

      const result = await build_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--custom-arg'],
          preferXcodebuild: true,
        },
        mockExecutor,
      );

      // Test that the function processes parameters correctly (build should fail due to mock)
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Build failed');
    });
  });
});
