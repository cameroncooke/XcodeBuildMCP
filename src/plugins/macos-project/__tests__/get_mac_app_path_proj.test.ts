import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import tool from '../get_mac_app_path_proj.ts';

// Mock child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('get_mac_app_path_proj', () => {
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = new MockChildProcess();
    const { spawn } = require('child_process');
    vi.mocked(spawn).mockReturnValue(mockProcess);
  });

  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('get_mac_app_path_proj');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe(
        'Gets the app bundle path for a macOS application using a project file.',
      );
    });

    it('should export a handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const validInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--verbose'],
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should validate schema with minimal valid inputs', () => {
      const validInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should reject invalid projectPath', () => {
      const invalidInput = {
        projectPath: 123,
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid scheme', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 123,
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe('Command Generation and Response Logic', () => {
    it('should successfully get app path for macOS project', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
        );
        mockProcess.emit('close', 0);
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -showBuildSettings -project /path/to/project.xcodeproj -scheme MyApp -configuration Debug',
        ],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ macOS app path: /path/to/build/MyApp.app' }],
      });
    });

    it('should handle missing required projectPath parameter', async () => {
      const args = {
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle missing required scheme parameter', async () => {
      const args = {
        projectPath: '/path/to/project.xcodeproj',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle command failure', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'error: Failed to get build settings');
        mockProcess.emit('close', 1);
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to get macOS app path\nDetails: error: Failed to get build settings',
          },
        ],
        isError: true,
      });
    });

    it('should handle spawn error', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn xcodebuild ENOENT'));
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to get macOS app path\nDetails: spawn xcodebuild ENOENT',
          },
        ],
        isError: true,
      });
    });

    it('should use default configuration when not provided', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
        );
        mockProcess.emit('close', 0);
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      await tool.handler(args);

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -showBuildSettings -project /path/to/project.xcodeproj -scheme MyApp -configuration Debug',
        ],
        expect.any(Object),
      );
    });

    it('should include optional parameters in command', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
        );
        mockProcess.emit('close', 0);
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--verbose'],
      };

      await tool.handler(args);

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -showBuildSettings -project /path/to/project.xcodeproj -scheme MyApp -configuration Release -derivedDataPath /path/to/derived --verbose',
        ],
        expect.any(Object),
      );
    });

    it('should handle missing build settings in output', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'OTHER_SETTING = value');
        mockProcess.emit('close', 0);
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to get macOS app path\nDetails: Could not extract app path from build settings',
          },
        ],
        isError: true,
      });
    });
  });
});
