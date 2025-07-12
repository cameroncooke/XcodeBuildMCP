/**
 * Tests for key_sequence plugin
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
import keySequencePlugin from '../key_sequence.ts';

// Mock all utilities from the index module
// Import mocked functions
describe('Key Sequence Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = new MockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess as any);
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(keySequencePlugin.name).toBe('key_sequence');
    });

    it('should have correct description', () => {
      expect(keySequencePlugin.description).toBe(
        'Press key sequence using HID keycodes on iOS simulator with configurable delay',
      );
    });

    it('should have handler function', () => {
      expect(typeof keySequencePlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(keySequencePlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40, 42, 44],
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          keyCodes: [40],
        }).success,
      ).toBe(false);

      // Invalid keyCodes - empty array
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [],
        }).success,
      ).toBe(false);

      // Invalid keyCodes - out of range
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [-1],
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [256],
        }).success,
      ).toBe(false);

      // Invalid delay - negative
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40],
          delay: -0.1,
        }).success,
      ).toBe(false);

      // Valid with optional delay
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40],
          delay: 0.1,
        }).success,
      ).toBe(true);

      // Missing required fields
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      // TODO: Remove mocked utility - test integration flow instead

      const result = await keySequencePlugin.handler({
        keyCodes: [40],
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return error for missing keyCodes', async () => {
      // TODO: Remove mocked utility - test integration flow instead

      const result = await keySequencePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: keyCodes' }],
        isError: true,
      });
    });

    it('should return success for valid key sequence execution', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'Key sequence [40,42,44] executed successfully.' }],
      });

      const result = await keySequencePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCodes: [40, 42, 44],
        delay: 0.1,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Key sequence [40,42,44] executed successfully.' }],
      });
    });

    it('should handle DependencyError when axe binary not found', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue(null);
      (
        createAxeNotAvailableResponse as MockedFunction<typeof createAxeNotAvailableResponse>
      ).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'AXe binary not found. Please install AXe to use UI testing features.',
          },
        ],
        isError: true,
      });

      const result = await keySequencePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCodes: [40],
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'AXe binary not found. Please install AXe to use UI testing features.',
          },
        ],
        isError: true,
      });
    });

    it('should handle AxeError from command execution', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [
          {
            type: 'text',
            text: "Failed to execute key sequence: axe command 'key-sequence' failed.",
          },
        ],
        isError: true,
      });

      const result = await keySequencePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCodes: [40],
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Failed to execute key sequence: axe command 'key-sequence' failed.",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'System error executing axe: System error occurred' }],
        isError: true,
      });

      const result = await keySequencePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCodes: [40],
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'System error executing axe: System error occurred' }],
        isError: true,
      });
    });

    it('should handle unexpected Error objects', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: Unexpected error' }],
        isError: true,
      });

      const result = await keySequencePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCodes: [40],
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: Unexpected error' }],
        isError: true,
      });
    });

    it('should handle unexpected string errors', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });

      const result = await keySequencePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCodes: [40],
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
