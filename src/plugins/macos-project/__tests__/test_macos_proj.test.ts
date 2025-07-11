import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import tool from '../test_macos_proj.ts';

// Mock child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('test_macos_proj', () => {
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = new MockChildProcess();
    const { spawn } = require('child_process');
    vi.mocked(spawn).mockReturnValue(mockProcess);
  });

  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('test_macos_proj');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe(
        'Runs tests for a macOS app using xcodebuild from a project file.',
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
        preferXcodebuild: true,
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

    it('should reject invalid preferXcodebuild', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        preferXcodebuild: 'yes',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe('Command Generation and Response Logic', () => {
    it('should generate correct xcodebuild test command for minimal arguments', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'TEST SUCCEEDED');
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
          'xcodebuild -project /path/to/project.xcodeproj -scheme MyApp -configuration Debug -skipMacroValidation -destination "platform=macOS" test',
        ],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ macOS Build test succeeded for scheme MyApp.' }],
      });
    });

    it('should generate correct xcodebuild test command with all arguments', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'TEST SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--verbose'],
        preferXcodebuild: true,
      };

      const result = await tool.handler(args);

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -project /path/to/project.xcodeproj -scheme MyApp -configuration Release -skipMacroValidation -destination "platform=macOS" -derivedDataPath /path/to/derived --verbose test',
        ],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ macOS Build test succeeded for scheme MyApp.' }],
      });
    });

    it('should handle test failure with literal error response', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'error: Test failed\n');
        mockProcess.emit('close', 1);
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ [stderr] error: Test failed' },
          { type: 'text', text: '❌ macOS Build test failed for scheme MyApp.' },
        ],
        isError: true,
      });
    });

    it('should handle spawn error with literal error response', async () => {
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
        content: [{ type: 'text', text: 'Error during macOS Build test: spawn xcodebuild ENOENT' }],
        isError: true,
      });
    });

    it('should use default configuration when not provided', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'TEST SUCCEEDED');
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
          'xcodebuild -project /path/to/project.xcodeproj -scheme MyApp -configuration Debug -skipMacroValidation -destination "platform=macOS" test',
        ],
        expect.any(Object),
      );
    });

    it('should include test warnings and errors in output', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'warning: deprecated test method\nerror: test assertion failed\nTEST SUCCEEDED',
        );
        mockProcess.emit('close', 0);
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          { type: 'text', text: '⚠️ Warning: warning: deprecated test method' },
          { type: 'text', text: '❌ Error: error: test assertion failed' },
          { type: 'text', text: '✅ macOS Build test succeeded for scheme MyApp.' },
        ],
      });
    });

    it('should handle preferXcodebuild parameter correctly', async () => {
      const { spawn } = require('child_process');

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'TEST SUCCEEDED');
        mockProcess.emit('close', 0);
      }, 0);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        preferXcodebuild: false,
      };

      const result = await tool.handler(args);

      // Verify the command was called correctly
      expect(spawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          'xcodebuild -project /path/to/project.xcodeproj -scheme MyApp -configuration Debug -skipMacroValidation -destination "platform=macOS" test',
        ],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ macOS Build test succeeded for scheme MyApp.' }],
      });
    });
  });
});
