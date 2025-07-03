import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import plugin from './get_mac_bundle_id.ts';
import * as validation from '../../src/utils/validation.ts';
import * as child_process from 'node:child_process';

// Mock modules
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('get_mac_bundle_id plugin', () => {
  const mockExecSync = vi.mocked(child_process.execSync);
  const mockValidateRequiredParam = vi.mocked(validation.validateRequiredParam);
  const mockValidateFileExists = vi.mocked(validation.validateFileExists);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful validations
    mockValidateRequiredParam.mockReturnValue({ isValid: true });
    mockValidateFileExists.mockReturnValue({ isValid: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('plugin structure', () => {
    it('should export correct name', () => {
      expect(plugin.name).toBe('get_mac_bundle_id');
    });

    it('should export correct description', () => {
      expect(plugin.description).toContain('Extracts the bundle identifier from a macOS app bundle');
      expect(plugin.description).toContain('IMPORTANT: You MUST provide the appPath parameter');
      expect(plugin.description).toContain('Example: get_mac_bundle_id({ appPath:');
    });

    it('should export schema with required appPath', () => {
      expect(plugin.schema).toBeDefined();
      expect(plugin.schema.shape).toBeDefined();
      expect(plugin.schema.shape.appPath).toBeDefined();
    });

    it('should export handler function', () => {
      expect(plugin.handler).toBeDefined();
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('handler functionality', () => {
    const validParams = {
      appPath: '/Applications/TextEdit.app',
    };

    it('should successfully extract bundle ID using defaults command', async () => {
      mockExecSync.mockReturnValueOnce(Buffer.from('com.apple.TextEdit\n'));

      const result = await plugin.handler(validParams);

      expect(mockExecSync).toHaveBeenCalledWith(
        'defaults read "/Applications/TextEdit.app/Contents/Info" CFBundleIdentifier'
      );
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Bundle ID for macOS app: com.apple.TextEdit');
      expect(result.content[1].text).toContain('Next Steps:');
      expect(result.content[1].text).toContain('launch_macos_app({ appPath: "/Applications/TextEdit.app" })');
    });

    it('should fall back to PlistBuddy if defaults command fails', async () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('defaults command failed');
        })
        .mockReturnValueOnce(Buffer.from('com.apple.TextEdit\n'));

      const result = await plugin.handler(validParams);

      expect(mockExecSync).toHaveBeenCalledTimes(2);
      expect(mockExecSync).toHaveBeenNthCalledWith(2,
        '/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "/Applications/TextEdit.app/Contents/Info.plist"'
      );
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Bundle ID for macOS app: com.apple.TextEdit');
    });

    it('should handle missing appPath parameter', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'appPath is required' }],
          isError: true,
        },
      });

      const result = await plugin.handler({ appPath: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('appPath is required');
    });

    it('should handle non-existent app path', async () => {
      mockValidateFileExists.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'File does not exist' }],
          isError: true,
        },
      });

      const result = await plugin.handler(validParams);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('File does not exist');
    });

    it('should handle errors when both commands fail', async () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('defaults command failed');
        })
        .mockImplementationOnce(() => {
          throw new Error('PlistBuddy command failed');
        });

      const result = await plugin.handler(validParams);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error extracting macOS bundle ID');
      expect(result.content[0].text).toContain('Could not extract bundle ID from Info.plist');
      expect(result.content[1].text).toContain('Make sure the path points to a valid macOS app bundle');
    });

    it('should trim whitespace from bundle ID', async () => {
      mockExecSync.mockReturnValueOnce(Buffer.from('  com.apple.TextEdit  \n'));

      const result = await plugin.handler(validParams);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe(' Bundle ID for macOS app: com.apple.TextEdit');
    });

    it('should handle complex app paths with spaces', async () => {
      const complexPath = '/Applications/My Complex App.app';
      mockExecSync.mockReturnValueOnce(Buffer.from('com.example.complex\n'));

      const result = await plugin.handler({ appPath: complexPath });

      expect(mockExecSync).toHaveBeenCalledWith(
        `defaults read "${complexPath}/Contents/Info" CFBundleIdentifier`
      );
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('com.example.complex');
    });

    it('should validate schema for invalid input', () => {
      expect(() => plugin.schema.parse({})).toThrow();
      expect(() => plugin.schema.parse({ appPath: 123 })).toThrow();
      expect(() => plugin.schema.parse({ appPath: null })).toThrow();
    });

    it('should validate schema for valid input', () => {
      const valid = plugin.schema.parse({ appPath: '/Applications/Test.app' });
      expect(valid.appPath).toBe('/Applications/Test.app');
    });
  });
});