/**
 * macOS Build Tools Tests - Comprehensive test coverage for build_macos.ts
 *
 * This test file provides complete coverage for all macOS build tools with proper
 * testing patterns that import actual production functions and mock external
 * dependencies only.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { execSync } from 'child_process';
import { getMacOSBundleId } from './bundleId.js';
import { ToolResponse } from '../types/common.js';

// Mock external dependencies only
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(), // CRITICAL: Use execSync for get_mac_bundle_id
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdtemp: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
}));

describe('macOS Build Tools Tests', () => {
  let mockExecSync: MockedFunction<typeof execSync>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockValidateFileExists: MockedFunction<any>;

  beforeEach(async () => {
    mockExecSync = vi.mocked(execSync);

    // Import validation utilities
    const validation = await import('../utils/validation.js');
    mockValidateRequiredParam = validation.validateRequiredParam as MockedFunction<any>;
    mockValidateFileExists = validation.validateFileExists as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('get_mac_bundle_id tool', () => {
    describe('parameter validation', () => {
      it('should reject missing appPath parameter', async () => {
        await expect(getMacOSBundleId({} as any)).rejects.toThrow('Required');
      });

      it('should reject non-existent app path', async () => {
        mockValidateRequiredParam.mockReturnValue({ isValid: true });
        mockValidateFileExists.mockReturnValue({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'File not found: /nonexistent/path.app' }],
            isError: true,
          },
        });

        const result = await getMacOSBundleId({ appPath: '/nonexistent/path.app' });

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: 'File not found: /nonexistent/path.app' },
        ]);
      });
    });

    describe('success scenarios', () => {
      it('should extract bundle ID successfully using defaults read', async () => {
        mockValidateRequiredParam.mockReturnValue({ isValid: true });
        mockValidateFileExists.mockReturnValue({ isValid: true });
        mockExecSync.mockReturnValue('com.example.MyApp\n');

        const result = await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

        expect(result.isError).toBe(false);
        expect(result.content).toEqual([
          { type: 'text', text: ' Bundle ID for macOS app: com.example.MyApp' },
          {
            type: 'text',
            text: `Next Steps:
- Launch the app: launch_macos_app({ appPath: "/path/to/MyApp.app" })`,
          },
        ]);

        expect(mockExecSync).toHaveBeenCalledWith(
          'defaults read "/path/to/MyApp.app/Contents/Info" CFBundleIdentifier',
        );
      });

      it('should fall back to PlistBuddy when defaults read fails', async () => {
        mockValidateRequiredParam.mockReturnValue({ isValid: true });
        mockValidateFileExists.mockReturnValue({ isValid: true });

        // First call (defaults read) fails, second call (PlistBuddy) succeeds
        mockExecSync
          .mockImplementationOnce(() => {
            throw new Error('defaults read failed');
          })
          .mockReturnValueOnce('com.example.MyApp\n');

        const result = await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

        expect(result.isError).toBe(false);
        expect(result.content).toEqual([
          { type: 'text', text: ' Bundle ID for macOS app: com.example.MyApp' },
          {
            type: 'text',
            text: `Next Steps:
- Launch the app: launch_macos_app({ appPath: "/path/to/MyApp.app" })`,
          },
        ]);

        expect(mockExecSync).toHaveBeenCalledWith(
          'defaults read "/path/to/MyApp.app/Contents/Info" CFBundleIdentifier',
        );
        expect(mockExecSync).toHaveBeenCalledWith(
          '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/path/to/MyApp.app/Contents/Info.plist"',
        );
      });
    });

    describe('error scenarios', () => {
      it('should handle failures when both methods fail', async () => {
        mockValidateRequiredParam.mockReturnValue({ isValid: true });
        mockValidateFileExists.mockReturnValue({ isValid: true });

        // Both defaults read and PlistBuddy fail
        mockExecSync.mockImplementation(() => {
          throw new Error('Command failed');
        });

        const result = await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          {
            type: 'text',
            text: 'Error extracting macOS bundle ID: Could not extract bundle ID from Info.plist: Command failed',
          },
          {
            type: 'text',
            text: 'Make sure the path points to a valid macOS app bundle (.app directory).',
          },
        ]);
      });

      it('should handle schema validation errors', async () => {
        await expect(getMacOSBundleId({ appPath: 123 } as any)).rejects.toThrow();
      });
    });

    describe('fallback mechanism', () => {
      it('should test both extraction methods in sequence', async () => {
        mockValidateRequiredParam.mockReturnValue({ isValid: true });
        mockValidateFileExists.mockReturnValue({ isValid: true });

        // Test that defaults read is tried first
        mockExecSync.mockReturnValueOnce('com.example.MyApp\n');

        await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

        expect(mockExecSync).toHaveBeenCalledWith(
          'defaults read "/path/to/MyApp.app/Contents/Info" CFBundleIdentifier',
        );
        expect(mockExecSync).toHaveBeenCalledTimes(1);
      });

      it('should try PlistBuddy only after defaults read fails', async () => {
        mockValidateRequiredParam.mockReturnValue({ isValid: true });
        mockValidateFileExists.mockReturnValue({ isValid: true });

        // First call fails, second succeeds
        mockExecSync
          .mockImplementationOnce(() => {
            throw new Error('defaults failed');
          })
          .mockReturnValueOnce('com.example.MyApp\n');

        await getMacOSBundleId({ appPath: '/path/to/MyApp.app' });

        expect(mockExecSync).toHaveBeenCalledTimes(2);
        expect(mockExecSync).toHaveBeenNthCalledWith(
          1,
          'defaults read "/path/to/MyApp.app/Contents/Info" CFBundleIdentifier',
        );
        expect(mockExecSync).toHaveBeenNthCalledWith(
          2,
          '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/path/to/MyApp.app/Contents/Info.plist"',
        );
      });
    });
  });
});
