import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import buildRunSimIdWs from '../build_run_sim_id_ws.ts';

describe('build_run_sim_id_ws tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildRunSimIdWs.name).toBe('build_run_sim_id_ws');
    });

    it('should have correct description', () => {
      expect(buildRunSimIdWs.description).toBe(
        "Builds and runs an app from a workspace on a simulator specified by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: build_run_sim_id_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildRunSimIdWs.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildRunSimIdWs.schema);

      // Valid input
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(true);

      // Missing required fields
      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      // Invalid types
      expect(
        schema.safeParse({
          workspacePath: 123,
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 123,
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 123,
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle validation failure for workspacePath', async () => {
      const mockExecutor = createMockExecutor({ success: true });

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: undefined,
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle validation failure for scheme', async () => {
      const mockExecutor = createMockExecutor({ success: true });

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: undefined,
          simulatorId: 'test-uuid-123',
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

    it('should handle validation failure for simulatorId', async () => {
      const mockExecutor = createMockExecutor({ success: true });

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: undefined,
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

    it('should handle build failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Build failed with error',
        output: '',
      });

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: '❌ [stderr] Build failed with error',
          },
          {
            type: 'text',
            text: '❌ Build build failed for scheme MyScheme.',
          },
        ],
      });
    });

    it('should handle successful build with proper parameter validation', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
      });

      const result = await buildRunSimIdWs.handler(
        {
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid-123',
        },
        mockExecutor,
      );

      // Should successfully process parameters and attempt build
      expect(result.isError).toBe(true); // Expected to fail due to missing simulator environment
      expect(result.content[0].text).toContain('Failed to extract app path from build settings');
    });
  });
});
