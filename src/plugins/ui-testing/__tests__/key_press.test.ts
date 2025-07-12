/**
 * Tests for key_press tool plugin
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { EventEmitter } from 'events';

// Mock only child_process.spawn at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

import { z } from 'zod';
import keyPressPlugin from '../key_press.ts';

// Mock all utilities from the index module
// Import mocked functions
describe('Key Press Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = new MockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess as any);
    vi.clearAllMocks();
  });

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
      // TODO: Remove mocked utility - test integration flow instead

      const result = await keyPressPlugin.handler({ keyCode: 40 });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return error for missing keyCode', async () => {
      // TODO: Remove mocked utility - test integration flow instead

      const result = await keyPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: keyCode' }],
        isError: true,
      });
    });

    it('should return success for valid key press execution', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      // TODO: Remove mocked utility - test integration flow instead

      const result = await keyPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCode: 40,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Key press (code: 40) simulated successfully.' }],
      });
    });

    it('should return success for key press with duration', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      // TODO: Remove mocked utility - test integration flow instead

      const result = await keyPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCode: 42,
        duration: 1.5,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Key press (code: 42) simulated successfully.' }],
      });
    });

    it('should handle DependencyError when axe is not available', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue(null);
      (
        createAxeNotAvailableResponse as MockedFunction<typeof createAxeNotAvailableResponse>
      ).mockReturnValue({
        content: [{ type: 'text', text: 'AXe tools not available' }],
        isError: true,
      });

      const result = await keyPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCode: 40,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'AXe tools not available' }],
        isError: true,
      });
    });

    it('should handle AxeError from failed command execution', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: "Failed to simulate key press (code: 40): axe command 'key' failed.",
          },
        ],
        isError: true,
      });

      const result = await keyPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCode: 40,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Failed to simulate key press (code: 40): axe command 'key' failed.",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'System error executing axe: System error occurred' }],
        isError: true,
      });

      const result = await keyPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCode: 40,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'System error executing axe: System error occurred' }],
        isError: true,
      });
    });

    it('should handle unexpected Error objects', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: Unexpected error' }],
        isError: true,
      });

      const result = await keyPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCode: 40,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: Unexpected error' }],
        isError: true,
      });
    });

    it('should handle unexpected string errors', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/usr/local/bin/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        {},
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });

      const result = await keyPressPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCode: 40,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
