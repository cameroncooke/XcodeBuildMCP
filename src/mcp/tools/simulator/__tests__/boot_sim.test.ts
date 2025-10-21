/**
 * Tests for boot_sim plugin (session-aware version)
 * Follows CLAUDE.md guidance: dependency injection, no vi-mocks, literal validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import bootSim, { boot_simLogic } from '../boot_sim.ts';

describe('boot_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(bootSim.name).toBe('boot_sim');
    });

    it('should have concise description', () => {
      expect(bootSim.description).toBe('Boots an iOS simulator.');
    });

    it('should expose empty public schema', () => {
      const schema = z.object(bootSim.schema);
      expect(schema.safeParse({}).success).toBe(true);
      expect(Object.keys(bootSim.schema)).toHaveLength(0);
    });
  });

  describe('Handler Requirements', () => {
    it('should require simulatorId when not provided', async () => {
      const result = await bootSim.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('simulatorId is required');
      expect(result.content[0].text).toContain('session-set-defaults');
    });
  });

  describe('Logic Behavior (Literal Results)', () => {
    it('should handle successful boot', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Simulator booted successfully',
      });

      const result = await boot_simLogic({ simulatorId: 'test-uuid-123' }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ Simulator booted successfully. To make it visible, use: open_sim()

Next steps:
1. Open the Simulator app (makes it visible): open_sim()
2. Install an app: install_app_sim({ simulatorId: "test-uuid-123", appPath: "PATH_TO_YOUR_APP" })
3. Launch an app: launch_app_sim({ simulatorId: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Simulator not found',
      });

      const result = await boot_simLogic({ simulatorId: 'invalid-uuid' }, mockExecutor);

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

      const result = await boot_simLogic({ simulatorId: 'test-uuid-123' }, mockExecutor);

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

      const result = await boot_simLogic({ simulatorId: 'test-uuid-123' }, mockExecutor);

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
      const calls: Array<{
        command: string[];
        description: string;
        allowStderr: boolean;
        timeout?: number;
      }> = [];
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

      await boot_simLogic({ simulatorId: 'test-uuid-123' }, mockExecutor);

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
