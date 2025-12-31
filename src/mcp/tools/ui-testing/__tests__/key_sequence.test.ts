/**
 * Tests for key_sequence plugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import keySequencePlugin, { key_sequenceLogic } from '../key_sequence.ts';

describe('Key Sequence Plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
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

    it('should expose public schema without simulatorId field', () => {
      const schema = z.object(keySequencePlugin.schema);

      expect(schema.safeParse({ keyCodes: [40, 42, 44] }).success).toBe(true);
      expect(schema.safeParse({ keyCodes: [40], delay: 0.1 }).success).toBe(true);
      expect(schema.safeParse({ keyCodes: [] }).success).toBe(false);
      expect(schema.safeParse({ keyCodes: [-1] }).success).toBe(false);
      expect(schema.safeParse({ keyCodes: [256] }).success).toBe(false);
      expect(schema.safeParse({ keyCodes: [40], delay: -0.1 }).success).toBe(false);

      const withSimId = schema.safeParse({
        simulatorId: '12345678-1234-4234-8234-123456789012',
        keyCodes: [40],
      });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as any)).toBe(false);

      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Requirements', () => {
    it('should require simulatorId session default when not provided', async () => {
      const result = await keySequencePlugin.handler({ keyCodes: [40] });

      expect(result.isError).toBe(true);
      const message = result.content[0].text;
      expect(message).toContain('Missing required session defaults');
      expect(message).toContain('simulatorId is required');
      expect(message).toContain('session-set-defaults');
    });

    it('should surface validation errors once simulator defaults exist', async () => {
      sessionStore.setDefaults({ simulatorId: '12345678-1234-4234-8234-123456789012' });

      const result = await keySequencePlugin.handler({ keyCodes: [] });

      expect(result.isError).toBe(true);
      const message = result.content[0].text;
      expect(message).toContain('Parameter validation failed');
      expect(message).toContain('keyCodes: At least one key code required');
    });
  });

  describe('Command Generation', () => {
    it('should generate correct axe command for basic key sequence', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'key sequence completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
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

      await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [40, 42, 44],
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/usr/local/bin/axe',
        'key-sequence',
        '--keycodes',
        '40,42,44',
        '--udid',
        '12345678-1234-4234-8234-123456789012',
      ]);
    });

    it('should generate correct axe command for key sequence with delay', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'key sequence completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
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

      await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [58, 59, 60],
          delay: 0.5,
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/usr/local/bin/axe',
        'key-sequence',
        '--keycodes',
        '58,59,60',
        '--delay',
        '0.5',
        '--udid',
        '12345678-1234-4234-8234-123456789012',
      ]);
    });

    it('should generate correct axe command for single key in sequence', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'key sequence completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
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

      await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [255],
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/usr/local/bin/axe',
        'key-sequence',
        '--keycodes',
        '255',
        '--udid',
        '12345678-1234-4234-8234-123456789012',
      ]);
    });

    it('should generate correct axe command with bundled axe path', async () => {
      let capturedCommand: string[] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'key sequence completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockAxeHelpers = {
        getAxePath: () => '/path/to/bundled/axe',
        getBundledAxeEnvironment: () => ({ AXE_PATH: '/some/path' }),
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

      await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [0, 1, 2, 3, 4],
          delay: 1.0,
        },
        trackingExecutor,
        mockAxeHelpers,
      );

      expect(capturedCommand).toEqual([
        '/path/to/bundled/axe',
        'key-sequence',
        '--keycodes',
        '0,1,2,3,4',
        '--delay',
        '1',
        '--udid',
        '12345678-1234-4234-8234-123456789012',
      ]);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should surface session default requirement when simulatorId is missing', async () => {
      const result = await keySequencePlugin.handler({ keyCodes: [40] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('simulatorId is required');
    });

    it('should return success for valid key sequence execution', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Key sequence executed',
        error: undefined,
      });

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
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

      const result = await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [40, 42, 44],
          delay: 0.1,
        },
        mockExecutor,
        mockAxeHelpers,
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

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
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

      const result = await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [40],
        },
        mockExecutor,
        mockAxeHelpers,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Key sequence [40] executed successfully.' }],
        isError: false,
      });
    });

    it('should handle DependencyError when axe binary not found', async () => {
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

      const result = await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [40],
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

    it('should handle AxeError from command execution', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
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

      const result = await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [40],
        },
        mockExecutor,
        mockAxeHelpers,
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

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
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

      const result = await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [40],
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
      const mockExecutor = () => {
        throw new Error('Unexpected error');
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
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

      const result = await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [40],
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
      const mockExecutor = () => {
        throw 'String error';
      };

      const mockAxeHelpers = {
        getAxePath: () => '/usr/local/bin/axe',
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

      const result = await key_sequenceLogic(
        {
          simulatorId: '12345678-1234-4234-8234-123456789012',
          keyCodes: [40],
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
