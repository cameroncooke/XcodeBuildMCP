/**
 * Tests for boot_sim plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../../test-utils/mock-executors.js';
import bootSim, { boot_simLogic } from '../boot_sim.ts';

describe('boot_sim tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(bootSim.name).toBe('boot_sim');
    });

    it('should have correct description', () => {
      expect(bootSim.description).toBe(
        "Boots an iOS simulator. After booting, use open_sim() to make the simulator visible. IMPORTANT: You MUST provide the simulatorUuid parameter. Example: boot_sim({ simulatorUuid: 'YOUR_UUID_HERE' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof bootSim.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid string field', () => {
      const schema = z.object(bootSim.schema);

      // Valid inputs
      expect(schema.safeParse({ simulatorUuid: 'test-uuid-123' }).success).toBe(true);
      expect(schema.safeParse({ simulatorUuid: 'ABC123-DEF456' }).success).toBe(true);

      // Invalid inputs
      expect(schema.safeParse({ simulatorUuid: 123 }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: null }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: undefined }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful boot', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Simulator booted successfully',
      });

      const result = await boot_simLogic({ simulatorUuid: 'test-uuid-123' }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ Simulator booted successfully. To make it visible, use: open_sim()

Next steps:
1. Open the Simulator app (makes it visible): open_sim()
2. Install an app: install_app_sim({ simulatorUuid: "test-uuid-123", appPath: "PATH_TO_YOUR_APP" })
3. Launch an app: launch_app_sim({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle validation failure via handler', async () => {
      const result = await bootSim.handler({ simulatorUuid: undefined });

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

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Simulator not found',
      });

      const result = await boot_simLogic({ simulatorUuid: 'invalid-uuid' }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Boot simulator operation failed: Simulator not found',
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor = async () => {
        throw new Error('Connection failed');
      };

      const result = await boot_simLogic({ simulatorUuid: 'test-uuid-123' }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Boot simulator operation failed: Connection failed',
          },
        ],
      });
    });

    it('should handle exception with string error', async () => {
      const mockExecutor = async () => {
        throw 'String error';
      };

      const result = await boot_simLogic({ simulatorUuid: 'test-uuid-123' }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Boot simulator operation failed: String error',
          },
        ],
      });
    });

    it('should verify command generation with mock executor', async () => {
      const calls: any[] = [];
      const mockExecutor = async (
        command: string[],
        description: string,
        allowStderr: boolean,
        timeout?: number,
      ) => {
        calls.push({ command, description, allowStderr, timeout });
        return {
          success: true,
          output: 'Simulator booted successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await boot_simLogic({ simulatorUuid: 'test-uuid-123' }, mockExecutor);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        command: ['xcrun', 'simctl', 'boot', 'test-uuid-123'],
        description: 'Boot Simulator',
        allowStderr: true,
        timeout: undefined,
      });
    });
  });
});
