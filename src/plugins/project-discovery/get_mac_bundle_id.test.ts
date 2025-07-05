import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import plugin from './get_mac_bundle_id.ts';
import { validateRequiredParam, validateFileExists } from '../../utils/index.js';
import { execSync } from 'child_process';

// Mock dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

const mockValidateRequiredParam = validateRequiredParam as MockedFunction<
  typeof validateRequiredParam
>;
const mockValidateFileExists = validateFileExists as MockedFunction<typeof validateFileExists>;
const mockExecSync = execSync as MockedFunction<typeof execSync>;

describe('get_mac_bundle_id plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('get_mac_bundle_id');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Extracts the bundle identifier from a macOS app bundle (.app). IMPORTANT: You MUST provide the appPath parameter. Example: get_mac_bundle_id({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_get_macos_bundle_id.",
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      expect(plugin.schema.safeParse({ appPath: '/Applications/TextEdit.app' }).success).toBe(true);
      expect(plugin.schema.safeParse({ appPath: '/Users/dev/MyApp.app' }).success).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      expect(plugin.schema.safeParse({}).success).toBe(false);
      expect(plugin.schema.safeParse({ appPath: 123 }).success).toBe(false);
      expect(plugin.schema.safeParse({ appPath: null }).success).toBe(false);
      expect(plugin.schema.safeParse({ appPath: undefined }).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error when appPath validation fails', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'appPath is required' }],
          isError: true,
        },
      });

      const result = await plugin.handler({ appPath: '' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'appPath is required' }],
        isError: true,
      });
    });

    it('should return error when file exists validation fails', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockValidateFileExists.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'File does not exist' }],
          isError: true,
        },
      });

      const result = await plugin.handler({ appPath: '/Applications/TextEdit.app' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'File does not exist' }],
        isError: true,
      });
    });

    it('should return success with bundle ID using defaults read', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockValidateFileExists.mockReturnValueOnce({ isValid: true });
      mockExecSync.mockReturnValueOnce('com.apple.TextEdit\n');

      const result = await plugin.handler({ appPath: '/Applications/TextEdit.app' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: ' Bundle ID for macOS app: com.apple.TextEdit',
          },
          {
            type: 'text',
            text: `Next Steps:
- Launch the app: launch_macos_app({ appPath: "/Applications/TextEdit.app" })`,
          },
        ],
        isError: false,
      });
    });

    it('should fallback to PlistBuddy when defaults read fails', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockValidateFileExists.mockReturnValueOnce({ isValid: true });
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('defaults command failed');
        })
        .mockReturnValueOnce('com.apple.TextEdit\n');

      const result = await plugin.handler({ appPath: '/Applications/TextEdit.app' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: ' Bundle ID for macOS app: com.apple.TextEdit',
          },
          {
            type: 'text',
            text: `Next Steps:
- Launch the app: launch_macos_app({ appPath: "/Applications/TextEdit.app" })`,
          },
        ],
        isError: false,
      });
    });

    it('should return error when both extraction methods fail', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockValidateFileExists.mockReturnValueOnce({ isValid: true });
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await plugin.handler({ appPath: '/Applications/TextEdit.app' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error extracting macOS bundle ID: Could not extract bundle ID from Info.plist: Command failed',
          },
          {
            type: 'text',
            text: 'Make sure the path points to a valid macOS app bundle (.app directory).',
          },
        ],
        isError: true,
      });
    });

    it('should handle Error objects in catch blocks', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockValidateFileExists.mockReturnValueOnce({ isValid: true });
      mockExecSync.mockImplementation(() => {
        throw new Error('Custom error message');
      });

      const result = await plugin.handler({ appPath: '/Applications/TextEdit.app' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error extracting macOS bundle ID: Could not extract bundle ID from Info.plist: Custom error message',
          },
          {
            type: 'text',
            text: 'Make sure the path points to a valid macOS app bundle (.app directory).',
          },
        ],
        isError: true,
      });
    });

    it('should handle string errors in catch blocks', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockValidateFileExists.mockReturnValueOnce({ isValid: true });
      mockExecSync.mockImplementation(() => {
        throw 'String error';
      });

      const result = await plugin.handler({ appPath: '/Applications/TextEdit.app' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error extracting macOS bundle ID: Could not extract bundle ID from Info.plist: String error',
          },
          {
            type: 'text',
            text: 'Make sure the path points to a valid macOS app bundle (.app directory).',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception during validation', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'Error extracting macOS bundle ID: Validation error',
            },
            {
              type: 'text',
              text: 'Make sure the path points to a valid macOS app bundle (.app directory).',
            },
          ],
          isError: true,
        },
      });

      const result = await plugin.handler({ appPath: '/Applications/TextEdit.app' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error extracting macOS bundle ID: Validation error',
          },
          {
            type: 'text',
            text: 'Make sure the path points to a valid macOS app bundle (.app directory).',
          },
        ],
        isError: true,
      });
    });
  });
});
