/**
 * Tests for button tool plugin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import buttonPlugin from '../button.ts';

describe('Button Plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buttonPlugin.name).toBe('button');
    });

    it('should have correct description', () => {
      expect(buttonPlugin.description).toBe(
        'Press hardware button on iOS simulator. Supported buttons: apple-pay, home, lock, side-button, siri',
      );
    });

    it('should have handler function', () => {
      expect(typeof buttonPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buttonPlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          buttonType: 'home',
        }).success,
      ).toBe(false);

      // Invalid buttonType
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'invalid-button',
        }).success,
      ).toBe(false);

      // Valid with duration
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
          duration: 2.5,
        }).success,
      ).toBe(true);

      // Invalid duration (negative)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
          duration: -1,
        }).success,
      ).toBe(false);

      // Test all valid button types
      const validButtons = ['apple-pay', 'home', 'lock', 'side-button', 'siri'];
      validButtons.forEach((buttonType) => {
        expect(
          schema.safeParse({
            simulatorUuid: '12345678-1234-1234-1234-123456789012',
            buttonType,
          }).success,
        ).toBe(true);
      });
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      const result = await buttonPlugin.handler({ buttonType: 'home' });

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

    it('should return error for missing buttonType', async () => {
      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'buttonType' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return success for valid button press', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'button press completed',
        error: undefined,
        process: { pid: 12345 },
      });

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await buttonPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: "Hardware button 'home' pressed successfully." }],
      });
    });

    it('should return success for button press with duration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'button press completed',
        error: undefined,
        process: { pid: 12345 },
      });

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await buttonPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'side-button',
          duration: 2.5,
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: "Hardware button 'side-button' pressed successfully." }],
      });
    });

    it('should handle DependencyError when axe is not available', async () => {
      const mockAxeHelpers = {
        getAxePath: () => null,
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await buttonPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        },
        undefined,
        mockAxeHelpers,
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

    it('should handle AxeError from failed command execution', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'axe command failed',
        process: { pid: 12345 },
      });

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await buttonPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Error: Failed to press button 'home': axe command 'button' failed.\nDetails: axe command failed",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      const mockExecutor = async () => {
        throw new Error('ENOENT: no such file or directory');
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await buttonPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result.content[0].text).toMatch(
        /^Error: System error executing axe: Failed to execute axe command: ENOENT: no such file or directory/,
      );
      expect(result.isError).toBe(true);
    });

    it('should handle unexpected Error objects', async () => {
      const mockExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await buttonPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result.content[0].text).toMatch(
        /^Error: System error executing axe: Failed to execute axe command: Unexpected error/,
      );
      expect(result.isError).toBe(true);
    });

    it('should handle unexpected string errors', async () => {
      const mockExecutor = async () => {
        throw 'String error';
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
      };

      const result = await buttonPlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        },
        mockExecutor,
        mockAxeHelpers,
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
