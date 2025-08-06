/**
 * Test for stop_app_sim_id_ws plugin with command generation tests
 *
 * Tests command generation for stopping apps in iOS simulators using simulator UUID,
 * including parameter validation and response formatting.
 *
 * Uses createMockExecutor for command execution mocking.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../../utils/command.js';
import stopAppSimIdWs from '../stop_app_sim.ts';
import { stop_app_simLogic } from '../../simulator-shared/stop_app_sim.js';

describe('stop_app_sim_id_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(stopAppSimIdWs.name).toBe('stop_app_sim');
    });

    it('should have correct description', () => {
      expect(stopAppSimIdWs.description).toBe(
        'Stops an app running in an iOS simulator. Requires simulatorUuid and bundleId.',
      );
    });

    it('should have handler function', () => {
      expect(typeof stopAppSimIdWs.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const schema = z.object(stopAppSimIdWs.schema);
      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.app',
        }).success,
      ).toBe(true);
      expect(
        schema.safeParse({
          simulatorUuid: 'F2B4A8E7-9C3D-4E5F-A1B2-C3D4E5F6A7B8',
          bundleId: 'com.apple.calculator',
        }).success,
      ).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      const schema = z.object(stopAppSimIdWs.schema);
      expect(schema.safeParse({}).success).toBe(false);
      expect(
        schema.safeParse({
          simulatorUuid: null,
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
          bundleId: null,
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({
          simulatorUuid: 123,
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct terminate command with basic parameters', async () => {
      const commands: any[] = [];
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        workingDirectory?: string,
      ) => {
        commands.push({ command, logPrefix, useShell, workingDirectory });
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await stop_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toEqual([
        'xcrun',
        'simctl',
        'terminate',
        'test-uuid-123',
        'com.example.app',
      ]);
      expect(commands[0].logPrefix).toBe('Stop App in Simulator');
      expect(commands[0].useShell).toBe(true);
      expect(commands[0].workingDirectory).toBe(undefined);
    });

    it('should generate command with different simulator UUID and bundle ID', async () => {
      const commands: any[] = [];
      const mockExecutor = async (command: string[]) => {
        commands.push({ command });
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await stop_app_simLogic(
        {
          simulatorUuid: 'F2B4A8E7-9C3D-4E5F-A1B2-C3D4E5F6A7B8',
          bundleId: 'com.apple.mobilesafari',
        },
        mockExecutor,
      );

      expect(commands[0].command).toEqual([
        'xcrun',
        'simctl',
        'terminate',
        'F2B4A8E7-9C3D-4E5F-A1B2-C3D4E5F6A7B8',
        'com.apple.mobilesafari',
      ]);
    });

    it('should generate command with complex bundle identifier', async () => {
      const commands: any[] = [];
      const mockExecutor = async (command: string[]) => {
        commands.push({ command });
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await stop_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.company.product.subproduct.MyApp',
        },
        mockExecutor,
      );

      expect(commands[0].command).toEqual([
        'xcrun',
        'simctl',
        'terminate',
        'test-uuid-123',
        'com.company.product.subproduct.MyApp',
      ]);
    });

    it('should generate command with real-world UUID format', async () => {
      const commands: any[] = [];
      const mockExecutor = async (command: string[]) => {
        commands.push({ command });
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await stop_app_simLogic(
        {
          simulatorUuid: 'ABCDEF12-3456-7890-ABCD-EF1234567890',
          bundleId: 'com.testflight.app',
        },
        mockExecutor,
      );

      expect(commands[0].command).toEqual([
        'xcrun',
        'simctl',
        'terminate',
        'ABCDEF12-3456-7890-ABCD-EF1234567890',
        'com.testflight.app',
      ]);
    });
  });

  describe('Parameter Validation', () => {
    it('should handle validation failure for simulatorUuid via handler', async () => {
      // Test Zod validation by calling the handler with invalid params
      const result = await stopAppSimIdWs.handler({
        bundleId: 'com.example.app',
        // simulatorUuid missing
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nsimulatorUuid: Required',
          },
        ],
        isError: true,
      });
    });

    it('should handle validation failure for bundleId via handler', async () => {
      // Test Zod validation by calling the handler with invalid params
      const result = await stopAppSimIdWs.handler({
        simulatorUuid: 'test-uuid-123',
        // bundleId missing
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nbundleId: Required',
          },
        ],
        isError: true,
      });
    });
  });

  describe('Response Processing', () => {
    it('should handle successful app termination', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await stop_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App com.example.app stopped successfully in simulator test-uuid-123',
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'No such process',
      });

      const result = await stop_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Stop app in simulator operation failed: No such process',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception during execution', async () => {
      const mockExecutor = async () => {
        throw new Error('Simulator not found');
      };

      const result = await stop_app_simLogic(
        {
          simulatorUuid: 'invalid-uuid',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Stop app in simulator operation failed: Simulator not found',
          },
        ],
        isError: true,
      });
    });
  });
});
