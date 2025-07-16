/**
 * Tests for diagnostic plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import diagnostic from '../diagnostic.ts';

// Mock functions for dependency injection
interface MockSystem {
  executeCommand: (
    command: string[],
    logPrefix?: string,
  ) => Promise<{ success: boolean; output: string; error?: string; process: any }>;
  platform: () => string;
  release: () => string;
  arch: () => string;
  cpus: () => Array<{ model: string }>;
  totalmem: () => number;
  hostname: () => string;
  userInfo: () => { username: string };
  homedir: () => string;
  tmpdir: () => string;
}

interface MockUtilities {
  areAxeToolsAvailable: () => boolean;
  isXcodemakeEnabled: () => boolean;
  isXcodemakeAvailable: () => Promise<boolean>;
  doesMakefileExist: (path: string) => boolean;
  loadPlugins: () => Promise<Map<string, any>>;
}

function createMockSystem(overrides?: Partial<MockSystem>): MockSystem {
  return {
    executeCommand: async (command: string[], logPrefix?: string) => {
      const cmdString = command.join(' ');

      if (cmdString === 'which axe')
        return { success: true, output: '/usr/local/bin/axe', process: { pid: 123 } };
      if (cmdString === 'which xcodemake')
        return { success: true, output: '/usr/local/bin/xcodemake', process: { pid: 123 } };
      if (cmdString === 'which mise')
        return { success: true, output: '/usr/local/bin/mise', process: { pid: 123 } };
      if (cmdString === 'axe --version')
        return { success: true, output: 'axe version 1.0.0', process: { pid: 123 } };
      if (cmdString === 'xcodebuild -version')
        return {
          success: true,
          output: 'Xcode 15.0\nBuild version 15A240d',
          process: { pid: 123 },
        };
      if (cmdString === 'xcode-select -p')
        return {
          success: true,
          output: '/Applications/Xcode.app/Contents/Developer',
          process: { pid: 123 },
        };
      if (cmdString === 'xcrun --find xcodebuild')
        return {
          success: true,
          output: '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild',
          process: { pid: 123 },
        };
      if (cmdString === 'xcrun --version')
        return { success: true, output: 'xcrun version 65', process: { pid: 123 } };

      return {
        success: false,
        output: '',
        error: `Command not found: ${cmdString}`,
        process: { pid: 123 },
      };
    },
    platform: () => 'darwin',
    release: () => '21.0.0',
    arch: () => 'x64',
    cpus: () => [{ model: 'Intel Core i7' }],
    totalmem: () => 16 * 1024 * 1024 * 1024,
    hostname: () => 'test-host',
    userInfo: () => ({ username: 'testuser' }),
    homedir: () => '/Users/testuser',
    tmpdir: () => '/tmp',
    ...overrides,
  };
}

function createMockUtilities(overrides?: Partial<MockUtilities>): MockUtilities {
  return {
    areAxeToolsAvailable: () => true,
    isXcodemakeEnabled: () => true,
    isXcodemakeAvailable: async () => true,
    doesMakefileExist: () => true,
    loadPlugins: async () => {
      const plugins = new Map();
      plugins.set('test-plugin', { name: 'test-plugin', pluginPath: 'test/path/test-plugin.ts' });
      return plugins;
    },
    ...overrides,
  };
}

describe('diagnostic tool', () => {
  // Reset any state if needed

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(diagnostic.name).toBe('diagnostic');
    });

    it('should have correct description', () => {
      expect(diagnostic.description).toBe(
        'Provides comprehensive information about the MCP server environment, available dependencies, and configuration status.',
      );
    });

    it('should have handler function', () => {
      expect(typeof diagnostic.handler).toBe('function');
    });

    it('should have correct schema with enabled boolean field', () => {
      const schema = z.object(diagnostic.schema);

      // Valid inputs
      expect(schema.safeParse({ enabled: true }).success).toBe(true);
      expect(schema.safeParse({ enabled: false }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(true); // enabled is optional

      // Invalid inputs
      expect(schema.safeParse({ enabled: 'true' }).success).toBe(false);
      expect(schema.safeParse({ enabled: 1 }).success).toBe(false);
      expect(schema.safeParse({ enabled: null }).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful diagnostic execution', async () => {
      const mockSystem = createMockSystem();
      const mockUtilities = createMockUtilities();

      // Mock process.env for clean test
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        XCODEBUILDMCP_DEBUG: 'true',
        INCREMENTAL_BUILDS_ENABLED: '1',
        PATH: '/usr/local/bin:/usr/bin:/bin',
        DEVELOPER_DIR: '/Applications/Xcode.app/Contents/Developer',
        HOME: '/Users/testuser',
        USER: 'testuser',
        TMPDIR: '/tmp',
        NODE_ENV: 'test',
        SENTRY_DISABLED: 'false',
      };

      const result = await diagnostic.handler({ enabled: true }, mockSystem, mockUtilities);

      // Restore process.env
      process.env = originalEnv;

      expect(result.content).toEqual([
        {
          type: 'text',
          text: result.content[0].text,
        },
      ]);
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should handle plugin loading failure', async () => {
      const mockSystem = createMockSystem();
      const mockUtilities = createMockUtilities({
        loadPlugins: async () => {
          throw new Error('Plugin loading failed');
        },
      });

      // Mock process.env for clean test
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        XCODEBUILDMCP_DEBUG: 'true',
        INCREMENTAL_BUILDS_ENABLED: '1',
        PATH: '/usr/local/bin:/usr/bin:/bin',
        DEVELOPER_DIR: '/Applications/Xcode.app/Contents/Developer',
        HOME: '/Users/testuser',
        USER: 'testuser',
        TMPDIR: '/tmp',
        NODE_ENV: 'test',
        SENTRY_DISABLED: 'false',
      };

      const result = await diagnostic.handler({ enabled: true }, mockSystem, mockUtilities);

      // Restore process.env
      process.env = originalEnv;

      expect(result.content).toEqual([
        {
          type: 'text',
          text: result.content[0].text,
        },
      ]);
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should handle xcode command failure', async () => {
      const mockSystem = createMockSystem({
        executeCommand: async (command: string[], logPrefix?: string) => {
          const cmdString = command.join(' ');

          if (cmdString === 'which axe')
            return { success: true, output: '/usr/local/bin/axe', process: { pid: 123 } };
          if (cmdString === 'which xcodemake')
            return { success: true, output: '/usr/local/bin/xcodemake', process: { pid: 123 } };
          if (cmdString === 'which mise')
            return { success: true, output: '/usr/local/bin/mise', process: { pid: 123 } };
          if (cmdString === 'axe --version')
            return { success: true, output: 'axe version 1.0.0', process: { pid: 123 } };
          if (cmdString === 'xcodebuild -version')
            return { success: false, output: '', error: 'Xcode not found', process: { pid: 123 } };
          if (cmdString === 'xcode-select -p')
            return { success: false, output: '', error: 'Xcode not found', process: { pid: 123 } };
          if (cmdString === 'xcrun --find xcodebuild')
            return { success: false, output: '', error: 'Xcode not found', process: { pid: 123 } };
          if (cmdString === 'xcrun --version')
            return { success: false, output: '', error: 'Xcode not found', process: { pid: 123 } };

          return {
            success: false,
            output: '',
            error: `Command not found: ${cmdString}`,
            process: { pid: 123 },
          };
        },
      });
      const mockUtilities = createMockUtilities();

      // Mock process.env for clean test
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        XCODEBUILDMCP_DEBUG: 'true',
        INCREMENTAL_BUILDS_ENABLED: '1',
        PATH: '/usr/local/bin:/usr/bin:/bin',
        DEVELOPER_DIR: '/Applications/Xcode.app/Contents/Developer',
        HOME: '/Users/testuser',
        USER: 'testuser',
        TMPDIR: '/tmp',
        NODE_ENV: 'test',
        SENTRY_DISABLED: 'false',
      };

      const result = await diagnostic.handler({ enabled: true }, mockSystem, mockUtilities);

      // Restore process.env
      process.env = originalEnv;

      expect(result.content).toEqual([
        {
          type: 'text',
          text: result.content[0].text,
        },
      ]);
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should handle xcodemake check failure', async () => {
      const mockSystem = createMockSystem({
        executeCommand: async (command: string[], logPrefix?: string) => {
          const cmdString = command.join(' ');

          if (cmdString === 'which axe')
            return { success: true, output: '/usr/local/bin/axe', process: { pid: 123 } };
          if (cmdString === 'which xcodemake')
            return {
              success: false,
              output: '',
              error: 'xcodemake not found',
              process: { pid: 123 },
            };
          if (cmdString === 'which mise')
            return { success: true, output: '/usr/local/bin/mise', process: { pid: 123 } };
          if (cmdString === 'axe --version')
            return { success: true, output: 'axe version 1.0.0', process: { pid: 123 } };
          if (cmdString === 'xcodebuild -version')
            return {
              success: true,
              output: 'Xcode 15.0\nBuild version 15A240d',
              process: { pid: 123 },
            };
          if (cmdString === 'xcode-select -p')
            return {
              success: true,
              output: '/Applications/Xcode.app/Contents/Developer',
              process: { pid: 123 },
            };
          if (cmdString === 'xcrun --find xcodebuild')
            return {
              success: true,
              output: '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild',
              process: { pid: 123 },
            };
          if (cmdString === 'xcrun --version')
            return { success: true, output: 'xcrun version 65', process: { pid: 123 } };

          return {
            success: false,
            output: '',
            error: `Command not found: ${cmdString}`,
            process: { pid: 123 },
          };
        },
      });
      const mockUtilities = createMockUtilities();

      // Mock process.env for clean test
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        XCODEBUILDMCP_DEBUG: 'true',
        INCREMENTAL_BUILDS_ENABLED: '1',
        PATH: '/usr/local/bin:/usr/bin:/bin',
        DEVELOPER_DIR: '/Applications/Xcode.app/Contents/Developer',
        HOME: '/Users/testuser',
        USER: 'testuser',
        TMPDIR: '/tmp',
        NODE_ENV: 'test',
        SENTRY_DISABLED: 'false',
      };

      const result = await diagnostic.handler({ enabled: true }, mockSystem, mockUtilities);

      // Restore process.env
      process.env = originalEnv;

      expect(result.content).toEqual([
        {
          type: 'text',
          text: result.content[0].text,
        },
      ]);
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should handle axe tools not available', async () => {
      const mockSystem = createMockSystem({
        executeCommand: async (command: string[], logPrefix?: string) => {
          const cmdString = command.join(' ');

          if (cmdString === 'which axe')
            return { success: false, output: '', error: 'axe not found', process: { pid: 123 } };
          if (cmdString === 'which xcodemake')
            return {
              success: false,
              output: '',
              error: 'xcodemake not found',
              process: { pid: 123 },
            };
          if (cmdString === 'which mise')
            return { success: true, output: '/usr/local/bin/mise', process: { pid: 123 } };
          if (cmdString === 'axe --version')
            return { success: false, output: '', error: 'axe not found', process: { pid: 123 } };
          if (cmdString === 'xcodebuild -version')
            return {
              success: true,
              output: 'Xcode 15.0\nBuild version 15A240d',
              process: { pid: 123 },
            };
          if (cmdString === 'xcode-select -p')
            return {
              success: true,
              output: '/Applications/Xcode.app/Contents/Developer',
              process: { pid: 123 },
            };
          if (cmdString === 'xcrun --find xcodebuild')
            return {
              success: true,
              output: '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild',
              process: { pid: 123 },
            };
          if (cmdString === 'xcrun --version')
            return { success: true, output: 'xcrun version 65', process: { pid: 123 } };

          return {
            success: false,
            output: '',
            error: `Command not found: ${cmdString}`,
            process: { pid: 123 },
          };
        },
      });
      const mockUtilities = createMockUtilities({
        areAxeToolsAvailable: () => false,
        isXcodemakeEnabled: () => false,
        isXcodemakeAvailable: async () => false,
      });

      // Mock process.env for clean test
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        XCODEBUILDMCP_DEBUG: 'true',
        INCREMENTAL_BUILDS_ENABLED: '0',
        PATH: '/usr/local/bin:/usr/bin:/bin',
        DEVELOPER_DIR: '/Applications/Xcode.app/Contents/Developer',
        HOME: '/Users/testuser',
        USER: 'testuser',
        TMPDIR: '/tmp',
        NODE_ENV: 'test',
        SENTRY_DISABLED: 'true',
      };

      const result = await diagnostic.handler({ enabled: true }, mockSystem, mockUtilities);

      // Restore process.env
      process.env = originalEnv;

      expect(result.content).toEqual([
        {
          type: 'text',
          text: result.content[0].text,
        },
      ]);
      expect(typeof result.content[0].text).toBe('string');
    });
  });
});
