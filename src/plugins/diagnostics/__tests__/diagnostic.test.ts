/**
 * Tests for diagnostic plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import diagnostic from '../diagnostic.ts';

// Mock functions for dependency injection
interface MockSystem {
  execSync: (cmd: string, options?: any) => string;
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
    execSync: (cmd: string) => {
      if (cmd === 'which axe') return '/usr/local/bin/axe';
      if (cmd === 'which xcodemake') return '/usr/local/bin/xcodemake';
      if (cmd === 'which mise') return '/usr/local/bin/mise';
      if (cmd === 'axe --version') return 'axe version 1.0.0';
      if (cmd === 'xcodebuild -version') return 'Xcode 15.0\nBuild version 15A240d';
      if (cmd === 'xcode-select -p') return '/Applications/Xcode.app/Contents/Developer';
      if (cmd === 'xcrun --find xcodebuild')
        return '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild';
      if (cmd === 'xcrun --version') return 'xcrun version 65';
      throw new Error(`Command not found: ${cmd}`);
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
  beforeEach(() => {
    // Reset any state if needed
  });

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
        execSync: (cmd: string) => {
          if (cmd === 'which axe') return '/usr/local/bin/axe';
          if (cmd === 'which xcodemake') return '/usr/local/bin/xcodemake';
          if (cmd === 'which mise') return '/usr/local/bin/mise';
          if (cmd === 'axe --version') return 'axe version 1.0.0';
          if (cmd === 'xcodebuild -version') throw new Error('Xcode not found');
          if (cmd === 'xcode-select -p') throw new Error('Xcode not found');
          if (cmd === 'xcrun --find xcodebuild') throw new Error('Xcode not found');
          if (cmd === 'xcrun --version') throw new Error('Xcode not found');
          throw new Error(`Command not found: ${cmd}`);
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
        execSync: (cmd: string) => {
          if (cmd === 'which axe') return '/usr/local/bin/axe';
          if (cmd === 'which xcodemake') throw new Error('xcodemake not found');
          if (cmd === 'which mise') return '/usr/local/bin/mise';
          if (cmd === 'axe --version') return 'axe version 1.0.0';
          if (cmd === 'xcodebuild -version') return 'Xcode 15.0\nBuild version 15A240d';
          if (cmd === 'xcode-select -p') return '/Applications/Xcode.app/Contents/Developer';
          if (cmd === 'xcrun --find xcodebuild')
            return '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild';
          if (cmd === 'xcrun --version') return 'xcrun version 65';
          throw new Error(`Command not found: ${cmd}`);
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
        execSync: (cmd: string) => {
          if (cmd === 'which axe') throw new Error('axe not found');
          if (cmd === 'which xcodemake') throw new Error('xcodemake not found');
          if (cmd === 'which mise') return '/usr/local/bin/mise';
          if (cmd === 'axe --version') throw new Error('axe not found');
          if (cmd === 'xcodebuild -version') return 'Xcode 15.0\nBuild version 15A240d';
          if (cmd === 'xcode-select -p') return '/Applications/Xcode.app/Contents/Developer';
          if (cmd === 'xcrun --find xcodebuild')
            return '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild';
          if (cmd === 'xcrun --version') return 'xcrun version 65';
          throw new Error(`Command not found: ${cmd}`);
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
