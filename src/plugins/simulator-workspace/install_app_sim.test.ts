import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Import the plugin
import installAppSim from './install_app_sim.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
  executeCommand: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('install_app_sim tool', () => {
  let mockLog: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockValidateFileExists: MockedFunction<any>;
  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockLog = utils.log as MockedFunction<any>;
    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockValidateFileExists = utils.validateFileExists as MockedFunction<any>;
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(installAppSim.name).toBe('install_app_sim');
    });

    it('should have correct description', () => {
      expect(installAppSim.description).toBe(
        "Installs an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and appPath parameters. Example: install_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', appPath: '/path/to/your/app.app' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof installAppSim.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid and appPath string fields', () => {
      const schema = z.object(installAppSim.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
          appPath: '/path/to/app.app',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 'ABC123-DEF456',
          appPath: '/another/path/app.app',
        }).success,
      ).toBe(true);

      // Invalid inputs
      expect(
        schema.safeParse({
          simulatorUuid: 123,
          appPath: '/path/to/app.app',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
          appPath: 123,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          appPath: '/path/to/app.app',
        }).success,
      ).toBe(false);

      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle validation failure for simulatorUuid', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'simulatorUuid is required',
            },
          ],
        },
      });

      const result = await installAppSim.handler({
        simulatorUuid: '',
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'simulatorUuid is required',
          },
        ],
      });
    });

    it('should handle validation failure for appPath', async () => {
      mockValidateRequiredParam
        .mockReturnValueOnce({
          isValid: true,
          errorResponse: null,
        })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: 'appPath is required',
              },
            ],
          },
        });

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'appPath is required',
          },
        ],
      });
    });

    it('should handle file does not exist', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockValidateFileExists.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'File does not exist: /path/to/app.app',
            },
          ],
        },
      });

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'File does not exist: /path/to/app.app',
          },
        ],
      });
    });

    it('should handle successful install', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockValidateFileExists.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'App installed',
        error: '',
      });

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App installed successfully in simulator test-uuid-123',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Launch the app: launch_app_sim({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockValidateFileExists.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Install failed',
      });

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Install app in simulator operation failed: Install failed',
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockValidateFileExists.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Command execution failed',
      });

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Install app in simulator operation failed: Command execution failed',
          },
        ],
      });
    });

    it('should handle exception with string error', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockValidateFileExists.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'String error',
      });

      const result = await installAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        appPath: '/path/to/app.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Install app in simulator operation failed: String error',
          },
        ],
      });
    });
  });
});
