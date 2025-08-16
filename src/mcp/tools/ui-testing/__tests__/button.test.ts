/**
 * Tests for button tool plugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../../test-utils/mock-executors.ts';
import buttonPlugin, { buttonLogic } from '../button.ts';

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

  describe('Command Generation', () => {
    it('should generate correct axe command for basic button press', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'button press completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'axe not available' }],
          isError: true,
        }),
      };

      await buttonLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/usr/local/bin/axe',
        'button',
        'home',
        '--udid',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });

    it('should generate correct axe command for button press with duration', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'button press completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'axe not available' }],
          isError: true,
        }),
      };

      await buttonLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'side-button',
          duration: 2.5,
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/usr/local/bin/axe',
        'button',
        'side-button',
        '--duration',
        '2.5',
        '--udid',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });

    it('should generate correct axe command for different button types', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'button press completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'axe not available' }],
          isError: true,
        }),
      };

      await buttonLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'apple-pay',
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/usr/local/bin/axe',
        'button',
        'apple-pay',
        '--udid',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });

    it('should generate correct axe command with bundled axe path', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'button press completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = {
        getAxePath: () => '/path/to/bundled/axe',
        getBundledAxeEnvironment: () => ({ AXE_PATH: '/some/path' }),
      };

      await buttonLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'siri',
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/path/to/bundled/axe',
        'button',
        'siri',
        '--udid',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      const result = await buttonPlugin.handler({ buttonType: 'home' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('simulatorUuid: Required');
    });

    it('should return error for missing buttonType', async () => {
      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('buttonType: Required');
    });

    it('should return error for invalid simulatorUuid format', async () => {
      const result = await buttonPlugin.handler({
        simulatorUuid: 'invalid-uuid-format',
        buttonType: 'home',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('Invalid Simulator UUID format');
    });

    it('should return error for invalid buttonType', async () => {
      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        buttonType: 'invalid-button',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
    });

    it('should return error for negative duration', async () => {
      const result = await buttonPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        buttonType: 'home',
        duration: -1,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('Duration must be non-negative');
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'axe not available' }],
          isError: true,
        }),
      };

      const result = await buttonLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: "Hardware button 'home' pressed successfully." }],
        isError: false,
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'axe not available' }],
          isError: true,
        }),
      };

      const result = await buttonLogic(
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
        isError: false,
      });
    });

    it('should handle DependencyError when axe is not available', async () => {
      const mockAxeHelpers = {
        getAxePath: () => null,
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [
            {
              type: 'text',
              text: 'Bundled axe tool not found. UI automation features are not available.\n\nThis is likely an installation issue with the npm package.\nPlease reinstall xcodebuildmcp or report this issue.',
            },
          ],
          isError: true,
        }),
      };

      const result = await buttonLogic(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          buttonType: 'home',
        },
        createNoopExecutor(),
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'axe not available' }],
          isError: true,
        }),
      };

      const result = await buttonLogic(
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'axe not available' }],
          isError: true,
        }),
      };

      const result = await buttonLogic(
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'axe not available' }],
          isError: true,
        }),
      };

      const result = await buttonLogic(
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
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'axe not available' }],
          isError: true,
        }),
      };

      const result = await buttonLogic(
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
