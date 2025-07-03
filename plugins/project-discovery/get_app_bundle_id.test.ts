import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from './get_app_bundle_id.ts';

// Mock the dependencies
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
}));

// Import mocked modules for use in tests
import { execSync } from 'child_process';
import { validateRequiredParam, validateFileExists } from '../../src/utils/validation.ts';

describe('get_app_bundle_id plugin', () => {
  const mockExecSync = execSync as any;
  const mockValidateRequiredParam = validateRequiredParam as any;
  const mockValidateFileExists = validateFileExists as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default validation mocks
    mockValidateRequiredParam.mockReturnValue({ isValid: true });
    mockValidateFileExists.mockReturnValue({ isValid: true });
    
    // Setup default execSync mock
    mockExecSync.mockReturnValue('com.example.MyApp\n');
  });

  describe('plugin structure', () => {
    it('should have the correct name', () => {
      expect(plugin.name).toBe('get_app_bundle_id');
    });

    it('should have a description', () => {
      expect(plugin.description).toBeTruthy();
      expect(typeof plugin.description).toBe('string');
      expect(plugin.description).toContain('Extracts the bundle identifier from an app bundle');
    });

    it('should have a schema with required fields', () => {
      expect(plugin.schema).toBeDefined();
      expect(plugin.schema.shape).toBeDefined();
      expect(plugin.schema.shape.appPath).toBeDefined();
    });

    it('should have a handler function', () => {
      expect(plugin.handler).toBeDefined();
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('handler functionality', () => {
    const validParams = {
      appPath: '/path/to/MyApp.app',
    };

    it('should validate appPath parameter', async () => {
      await plugin.handler(validParams);
      
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('appPath', validParams.appPath);
    });

    it('should check if app path exists', async () => {
      await plugin.handler(validParams);
      
      expect(mockValidateFileExists).toHaveBeenCalledWith(validParams.appPath);
    });

    it('should return error if appPath validation fails', async () => {
      const errorResponse = { content: [{ type: 'text', text: 'Missing appPath' }], isError: true };
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse,
      });

      const result = await plugin.handler({ appPath: 'valid-path' });
      
      expect(result).toBe(errorResponse);
    });

    it('should return error if file exists validation fails', async () => {
      const errorResponse = { content: [{ type: 'text', text: 'File not found' }], isError: true };
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true }); // appPath validation passes
      mockValidateFileExists.mockReturnValueOnce({
        isValid: false,
        errorResponse,
      });

      const result = await plugin.handler(validParams);
      
      expect(result).toBe(errorResponse);
    });

    it('should try defaults read first', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockValidateFileExists.mockReturnValue({ isValid: true });
      mockExecSync.mockReturnValue('com.example.MyApp\n');

      await plugin.handler(validParams);
      
      expect(mockExecSync).toHaveBeenCalledWith(
        `defaults read "${validParams.appPath}/Info" CFBundleIdentifier`
      );
    });

    it('should fallback to PlistBuddy if defaults read fails', async () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('defaults read failed');
        })
        .mockReturnValueOnce('com.example.MyApp\n');

      await plugin.handler(validParams);
      
      expect(mockExecSync).toHaveBeenCalledWith(
        `defaults read "${validParams.appPath}/Info" CFBundleIdentifier`
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${validParams.appPath}/Info.plist"`
      );
    });

    it('should return success response with bundle ID', async () => {
      mockExecSync.mockReturnValue('com.example.MyApp\n');

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('Bundle ID: com.example.MyApp');
      expect(result.content[1].text).toContain('Next Steps:');
    });

    it('should trim whitespace from bundle ID', async () => {
      mockExecSync.mockReturnValue('  com.example.MyApp  \n');

      const result = await plugin.handler(validParams);
      
      expect(result.content[0].text).toContain('Bundle ID: com.example.MyApp');
    });

    it('should include next steps for simulator and device usage', async () => {
      mockExecSync.mockReturnValue('com.example.MyApp\n');

      const result = await plugin.handler(validParams);
      
      const nextStepsText = result.content[1].text;
      expect(nextStepsText).toContain('install_app_in_simulator');
      expect(nextStepsText).toContain('launch_app_in_simulator');
      expect(nextStepsText).toContain('install_app_device');
      expect(nextStepsText).toContain('launch_app_device');
      expect(nextStepsText).toContain('com.example.MyApp');
    });

    it('should return error response when both extraction methods fail', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error extracting app bundle ID');
      expect(result.content[1].text).toContain('Make sure the path points to a valid app bundle');
    });

    it('should handle Error objects in catch blocks', async () => {
      const errorMessage = 'Custom error message';
      mockExecSync.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(`Error extracting app bundle ID: Could not extract bundle ID from Info.plist: ${errorMessage}`);
    });

    it('should handle string errors in catch blocks', async () => {
      const errorMessage = 'String error';
      mockExecSync.mockImplementation(() => {
        throw errorMessage;
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(`Error extracting app bundle ID: Could not extract bundle ID from Info.plist: ${errorMessage}`);
    });
  });

  describe('edge cases', () => {
    const validParams = {
      appPath: '/path/to/MyApp.app',
    };

    it('should handle app paths with spaces', async () => {
      const pathWithSpaces = '/path/to/My App.app';
      mockExecSync.mockReturnValue('com.example.MyApp\n');

      await plugin.handler({ appPath: pathWithSpaces });
      
      expect(mockExecSync).toHaveBeenCalledWith(
        `defaults read "${pathWithSpaces}/Info" CFBundleIdentifier`
      );
    });

    it('should handle app paths with special characters', async () => {
      const pathWithSpecialChars = '/path/to/My-App_v1.0.app';
      mockExecSync.mockReturnValue('com.example.MyApp\n');

      await plugin.handler({ appPath: pathWithSpecialChars });
      
      expect(mockExecSync).toHaveBeenCalledWith(
        `defaults read "${pathWithSpecialChars}/Info" CFBundleIdentifier`
      );
    });

    it('should handle bundle IDs with various formats', async () => {
      const complexBundleId = 'com.company-name.app-name.sub-component';
      mockExecSync.mockReturnValue(`${complexBundleId}\n`);

      const result = await plugin.handler(validParams);
      
      expect(result.content[0].text).toContain(`Bundle ID: ${complexBundleId}`);
      expect(result.content[1].text).toContain(complexBundleId);
    });

    it('should handle empty bundle ID gracefully', async () => {
      mockExecSync.mockReturnValue('\n');

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Bundle ID: ');
    });
  });

  describe('parameter validation edge cases', () => {
    it('should handle undefined appPath (Zod validation)', async () => {
      try {
        await plugin.handler({ appPath: undefined });
        expect.fail('Should have thrown ZodError');
      } catch (error) {
        expect(error.name).toBe('ZodError');
        expect(error.issues[0].path).toEqual(['appPath']);
        expect(error.issues[0].message).toBe('Required');
      }
    });

    it('should handle null appPath (Zod validation)', async () => {
      try {
        await plugin.handler({ appPath: null });
        expect.fail('Should have thrown ZodError');
      } catch (error) {
        expect(error.name).toBe('ZodError');
        expect(error.issues[0].path).toEqual(['appPath']);
        expect(error.issues[0].message).toBe('Expected string, received null');
      }
    });

    it('should handle empty string appPath', async () => {
      const errorResponse = { content: [{ type: 'text', text: 'appPath cannot be empty' }], isError: true };
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse,
      });

      const result = await plugin.handler({ appPath: '' });
      
      expect(result).toBe(errorResponse);
    });
  });
});