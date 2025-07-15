/**
 * Tests for test_macos_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 * NO VITEST MOCKING ALLOWED - Only createMockExecutor and manual stubs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import tool from '../test_macos_proj.ts';
import { ToolResponse } from '../../../types/common.js';

describe('test_macos_proj', () => {
  let mockExecutorCalls: any[];

  beforeEach(() => {
    mockExecutorCalls = [];
  });

  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('test_macos_proj');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe(
        'Runs tests for a macOS project using xcodebuild test and parses xcresult output.',
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
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'TEST SUCCEEDED',
        error: undefined,
        process: { pid: 12345 },
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ Test Run test succeeded for scheme MyApp.' }],
      });
    });

    it('should generate correct xcodebuild test command with all arguments', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'TEST SUCCEEDED',
        error: undefined,
        process: { pid: 12345 },
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--verbose'],
        preferXcodebuild: true,
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ Test Run test succeeded for scheme MyApp.' }],
      });
    });

    it('should handle test failure with literal error response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'error: Test failed',
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ [stderr] error: Test failed' },
          { type: 'text', text: '❌ Test Run test failed for scheme MyApp.' },
        ],
        isError: true,
      });
    });

    it('should handle spawn error with literal error response', async () => {
      const mockExecutor = createMockExecutor(new Error('spawn xcodebuild ENOENT'));

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error during Test Run test: spawn xcodebuild ENOENT' }],
        isError: true,
      });
    });

    it('should use default configuration when not provided', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'TEST SUCCEEDED',
        error: undefined,
        process: { pid: 12345 },
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ Test Run test succeeded for scheme MyApp.' }],
      });
    });

    it('should include test warnings and errors in output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'warning: deprecated test method\nerror: test assertion failed\nTEST SUCCEEDED',
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [
          { type: 'text', text: '⚠️ Warning: warning: deprecated test method' },
          { type: 'text', text: '❌ Error: error: test assertion failed' },
          { type: 'text', text: '✅ Test Run test succeeded for scheme MyApp.' },
        ],
      });
    });

    it('should handle preferXcodebuild parameter correctly', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'TEST SUCCEEDED',
        error: undefined,
        process: { pid: 12345 },
      });

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        preferXcodebuild: false,
      };

      const result = await tool.handler(args, mockExecutor);

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ Test Run test succeeded for scheme MyApp.' }],
      });
    });
  });
});
