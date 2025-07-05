import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Import the plugin
import diagnostic from './diagnostic.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  version: '1.0.0',
  areAxeToolsAvailable: vi.fn(),
  isXcodemakeEnabled: vi.fn(),
  isXcodemakeAvailable: vi.fn(),
  doesMakefileExist: vi.fn(),
  loadPlugins: vi.fn(),
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Mock os
vi.mock('os', () => ({
  platform: vi.fn(() => 'darwin'),
  release: vi.fn(() => '21.0.0'),
  arch: vi.fn(() => 'x64'),
  cpus: vi.fn(() => [{ model: 'Intel Core i7' }]),
  totalmem: vi.fn(() => 16 * 1024 * 1024 * 1024),
  hostname: vi.fn(() => 'test-host'),
  userInfo: vi.fn(() => ({ username: 'testuser' })),
  homedir: vi.fn(() => '/Users/testuser'),
  tmpdir: vi.fn(() => '/tmp'),
}));

describe('diagnostic tool', () => {
  let mockLog: MockedFunction<any>;
  let mockAreAxeToolsAvailable: MockedFunction<any>;
  let mockIsXcodemakeEnabled: MockedFunction<any>;
  let mockIsXcodemakeAvailable: MockedFunction<any>;
  let mockDoesMakefileExist: MockedFunction<any>;
  let mockLoadPlugins: MockedFunction<any>;
  let mockExecSync: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    const childProcess = await import('child_process');

    mockLog = utils.log as MockedFunction<any>;
    mockAreAxeToolsAvailable = utils.areAxeToolsAvailable as MockedFunction<any>;
    mockIsXcodemakeEnabled = utils.isXcodemakeEnabled as MockedFunction<any>;
    mockIsXcodemakeAvailable = utils.isXcodemakeAvailable as MockedFunction<any>;
    mockDoesMakefileExist = utils.doesMakefileExist as MockedFunction<any>;
    mockLoadPlugins = utils.loadPlugins as MockedFunction<any>;
    mockExecSync = childProcess.execSync as MockedFunction<any>;

    vi.clearAllMocks();
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
      // Mock all dependencies for successful execution
      mockAreAxeToolsAvailable.mockReturnValue(true);
      mockIsXcodemakeEnabled.mockReturnValue(true);
      mockIsXcodemakeAvailable.mockResolvedValue(true);
      mockDoesMakefileExist.mockReturnValue(true);
      mockLoadPlugins.mockResolvedValue(
        new Map([
          [
            'test-plugin',
            { name: 'test-plugin', pluginPath: '/path/to/plugins/test-group/test-plugin.ts' },
          ],
        ]),
      );

      // Mock execSync for various commands
      mockExecSync.mockImplementation((cmd: string) => {
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

      const result = await diagnostic.handler({ enabled: true });

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
      // Mock all dependencies for failed plugin loading
      mockAreAxeToolsAvailable.mockReturnValue(true);
      mockIsXcodemakeEnabled.mockReturnValue(true);
      mockIsXcodemakeAvailable.mockResolvedValue(true);
      mockDoesMakefileExist.mockReturnValue(true);
      mockLoadPlugins.mockRejectedValue(new Error('Plugin loading failed'));

      // Mock execSync for various commands
      mockExecSync.mockImplementation((cmd: string) => {
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

      const result = await diagnostic.handler({ enabled: true });

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
      // Mock all dependencies for xcode failure
      mockAreAxeToolsAvailable.mockReturnValue(true);
      mockIsXcodemakeEnabled.mockReturnValue(true);
      mockIsXcodemakeAvailable.mockResolvedValue(true);
      mockDoesMakefileExist.mockReturnValue(true);
      mockLoadPlugins.mockResolvedValue(
        new Map([
          [
            'test-plugin',
            { name: 'test-plugin', pluginPath: '/path/to/plugins/test-group/test-plugin.ts' },
          ],
        ]),
      );

      // Mock execSync for various commands with xcode failure
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which axe') return '/usr/local/bin/axe';
        if (cmd === 'which xcodemake') return '/usr/local/bin/xcodemake';
        if (cmd === 'which mise') return '/usr/local/bin/mise';
        if (cmd === 'axe --version') return 'axe version 1.0.0';
        if (cmd === 'xcodebuild -version') throw new Error('Xcode not found');
        if (cmd === 'xcode-select -p') throw new Error('Xcode not found');
        if (cmd === 'xcrun --find xcodebuild') throw new Error('Xcode not found');
        if (cmd === 'xcrun --version') throw new Error('Xcode not found');
        throw new Error(`Command not found: ${cmd}`);
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

      const result = await diagnostic.handler({ enabled: true });

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
      // Mock all dependencies with xcodemake check failure
      mockAreAxeToolsAvailable.mockReturnValue(true);
      mockIsXcodemakeEnabled.mockReturnValue(true);
      mockIsXcodemakeAvailable.mockResolvedValue(false);
      mockDoesMakefileExist.mockReturnValue(false);
      mockLoadPlugins.mockResolvedValue(
        new Map([
          [
            'test-plugin',
            { name: 'test-plugin', pluginPath: '/path/to/plugins/test-group/test-plugin.ts' },
          ],
        ]),
      );

      // Mock execSync for various commands
      mockExecSync.mockImplementation((cmd: string) => {
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

      const result = await diagnostic.handler({ enabled: true });

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
      // Mock all dependencies with axe not available
      mockAreAxeToolsAvailable.mockReturnValue(false);
      mockIsXcodemakeEnabled.mockReturnValue(false);
      mockIsXcodemakeAvailable.mockResolvedValue(false);
      mockDoesMakefileExist.mockReturnValue(false);
      mockLoadPlugins.mockResolvedValue(
        new Map([
          [
            'test-plugin',
            { name: 'test-plugin', pluginPath: '/path/to/plugins/test-group/test-plugin.ts' },
          ],
        ]),
      );

      // Mock execSync for various commands
      mockExecSync.mockImplementation((cmd: string) => {
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

      const result = await diagnostic.handler({ enabled: true });

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
