/**
 * Tests for key_sequence plugin
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import keySequencePlugin from '../key_sequence.ts';

describe('Key Sequence Plugin', () => {
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
      const result = await keySequencePlugin.handler({
        keyCodes: [40],
      });

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

    it('should return error for missing keyCodes', async () => {
      const result = await keySequencePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'keyCodes' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return success for valid key sequence execution', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Key sequence executed',
        error: undefined,
      });

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keySequencePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40, 42, 44],
          delay: 0.1,
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Key sequence [40,42,44] executed successfully.' }],
        isError: false,
      });
    });

    it('should return success for key sequence without delay', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Key sequence executed',
        error: undefined,
      });

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keySequencePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40],
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Key sequence [40] executed successfully.' }],
        isError: false,
      });
    });

    it('should handle DependencyError when axe binary not found', async () => {
      const mockGetAxePath = () => null;
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keySequencePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40],
        },
        undefined,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Bundled axe tool not found. UI automation features are not available.\n\nThis is likely an installation issue with the npm package.\nPlease reinstall xcodebuildmcp or report this issue.',
          },
        ],
        isError: true,
      });
    });

    it('should handle AxeError from command execution', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keySequencePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40],
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Error: Failed to execute key sequence: axe command 'key-sequence' failed.\nDetails: Simulator not found",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      const mockExecutor = () => {
        throw new Error('ENOENT: no such file or directory');
      };

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keySequencePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40],
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result.content[0].text).toMatch(
        /^Error: System error executing axe: Failed to execute axe command: ENOENT: no such file or directory/,
      );
      expect(result.isError).toBe(true);
    });

    it('should handle unexpected Error objects', async () => {
      const mockExecutor = () => {
        throw new Error('Unexpected error');
      };

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keySequencePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40],
        },
        mockExecutor,
        mockGetAxePath,
        mockGetBundledAxeEnvironment,
      );

      expect(result.content[0].text).toMatch(
        /^Error: System error executing axe: Failed to execute axe command: Unexpected error/,
      );
      expect(result.isError).toBe(true);
    });

    it('should handle unexpected string errors', async () => {
      const mockExecutor = () => {
        throw 'String error';
      };

      const mockGetAxePath = () => '/usr/local/bin/axe';
      const mockGetBundledAxeEnvironment = () => ({});

      const result = await keySequencePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40],
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
