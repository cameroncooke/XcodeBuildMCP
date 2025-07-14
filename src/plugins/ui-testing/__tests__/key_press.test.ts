/**
 * Tests for key_press tool plugin
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import keyPressPlugin from '../key_press.ts';

describe('Key Press Plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(keyPressPlugin.name).toBe('key_press');
    });

    it('should have correct description', () => {
      expect(keyPressPlugin.description).toBe(
        'Press a single key by keycode on the simulator. Common keycodes: 40=Return, 42=Backspace, 43=Tab, 44=Space, 58-67=F1-F10.',
      );
    });

    it('should have handler function', () => {
      expect(typeof keyPressPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(keyPressPlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 40,
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          keyCode: 40,
        }).success,
      ).toBe(false);

      // Invalid keyCode (string)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 'invalid',
        }).success,
      ).toBe(false);

      // Invalid keyCode (below range)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: -1,
        }).success,
      ).toBe(false);

      // Invalid keyCode (above range)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 256,
        }).success,
      ).toBe(false);

      // Valid with duration
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 40,
          duration: 1.5,
        }).success,
      ).toBe(true);

      // Invalid duration (negative)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 40,
          duration: -1,
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      const result = await keyPressPlugin.handler({ keyCode: 40 });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return error for missing keyCode', async () => {
      const result = await keyPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'keyCode' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return success for valid key press execution', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'key press completed',
        error: '',
      });

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keyPressPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 40,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Key press (code: 40) simulated successfully.' }],
      });
    });

    it('should return success for key press with duration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'key press completed',
        error: '',
      });

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keyPressPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 42,
          duration: 1.5,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Key press (code: 42) simulated successfully.' }],
      });
    });

    it('should handle DependencyError when axe is not available', async () => {
      const mockGetAxePath = () => null;
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keyPressPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 40,
        },
        undefined,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text:
              'Bundled axe tool not found. UI automation features are not available.\n\n' +
              'This is likely an installation issue with the npm package.\n' +
              'Please reinstall xcodebuildmcp or report this issue.',
          },
        ],
        isError: true,
      });
    });

    it('should handle AxeError from failed command execution', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'axe command failed',
      });

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keyPressPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 40,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Error: Failed to simulate key press (code: 40): axe command 'key' failed.\nDetails: axe command failed",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      const mockExecutor = () => {
        throw new Error('System error occurred');
      };

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keyPressPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 40,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error: System error executing axe: Failed to execute axe command: System error occurred',
      );
    });

    it('should handle unexpected Error objects', async () => {
      const mockExecutor = () => {
        throw new Error('Unexpected error');
      };

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keyPressPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 40,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error: System error executing axe: Failed to execute axe command: Unexpected error',
      );
    });

    it('should handle unexpected string errors', async () => {
      const mockExecutor = () => {
        throw 'String error';
      };

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keyPressPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 40,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: System error executing axe: Failed to execute axe command: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
